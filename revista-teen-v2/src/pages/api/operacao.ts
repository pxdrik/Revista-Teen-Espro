/**
 * Banco do app da redação (public/redacao-*): histórico de posts, fila do Instagram e
 * fila do site, guardados no Upstash Redis ligado ao projeto na Vercel.
 *
 * A página não fala com o Redis: só esta rota tem a chave. Quem entra com a senha da
 * equipe (SENHA_EQUIPE) recebe um cookie httpOnly; trocar a senha derruba todo mundo.
 *
 * Chaves: rt:posts (sorted set por criadoEm), rt:post:<id> (JSON), rt:thumb:<id> e
 * rt:foto:<id> (JPEG em base64, servidos como imagem para não pesar a lista).
 *
 * "Publicar no site" (POST acao=publicar) grava a matéria em src/data/posts-do-app.json e
 * a foto em public/images/artigos/ direto no GitHub (GITHUB_TOKEN_SITE), num commit só.
 * O push dispara o deploy da Vercel. Antes, a matéria passa pelo mesmo articleSchema do
 * build: o que quebraria o build é recusado aqui, e o site no ar nunca trava.
 */
import type { APIRoute } from "astro";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { articleSchema, type ArticleInput } from "@/lib/schema";
import { categoryStyles } from "@/data/edition-2026";

export const prerender = false;

const COOKIE = "rt_op";
const LIMITE_LISTA = 300;

async function redis<T = unknown>(...cmds: (string | number)[][]): Promise<T[]> {
  const r = await fetch(process.env.KV_REST_API_URL + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.KV_REST_API_TOKEN },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error("redis " + r.status);
  const out = (await r.json()) as { result?: T; error?: string }[];
  const erro = out.find((x) => x.error);
  if (erro) throw new Error("redis " + erro.error);
  return out.map((x) => x.result as T);
}

const token = () => createHmac("sha256", process.env.SENHA_EQUIPE ?? "").update("revista-teen-operacao").digest("hex");
function autorizado(cookie: string | undefined) {
  if (!process.env.SENHA_EQUIPE || !cookie) return false;
  const a = Buffer.from(cookie), b = Buffer.from(token());
  return a.length === b.length && timingSafeEqual(a, b);
}

const json = (dados: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(dados), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });

const ID = z.string().uuid();
const jpeg = (max: number) => z.string().max(max).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/);
const txt = (max: number) => z.string().max(max);
const quando = z.string().max(40).nullable().optional();
const status = z.enum(["pendente", "publicado"]);

const postSchema = z.object({
  criadoEm: txt(40),
  autor: txt(120), selo: txt(80), editoria: txt(80), fonte: txt(200),
  tituloOriginal: txt(500), artigo: txt(20000),
  instagram: z.object({ titulo: txt(200), texto: txt(2000), legenda: txt(3000), hashtags: txt(600) }),
  site: z.object({ titulo: txt(300), paragrafos: z.array(txt(3000)).max(3), alt: txt(300).optional(), tags: z.array(txt(40)).max(6).optional() }),
  foco: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
  zoom: z.number().min(1).max(3),
  temFoto: z.boolean(),
  siteStatus: status, publicadoEm: quando,
  igStatus: status, igPublicadoEm: quando,
});
const salvarSchema = z.object({
  id: ID.optional(),
  post: postSchema,
  thumb: jpeg(120_000),
  /** Ausente: mantém a foto salva. null: apaga. */
  foto: jpeg(400_000).nullable().optional(),
});
const marcarSchema = z.object({ id: ID, ig: status.optional(), site: status.optional() });

const semPrefixo = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(",") + 1);

export const GET: APIRoute = async ({ url, cookies }) => {
  if (!autorizado(cookies.get(COOKIE)?.value)) return json({ erro: "senha" }, 401);
  const id = url.searchParams.get("id");
  const imagem = url.searchParams.get("img");

  if (id && !ID.safeParse(id).success) return json({ erro: "id" }, 400);

  if (id && (imagem === "thumb" || imagem === "foto")) {
    const [b64] = await redis<string | null>(["GET", `rt:${imagem}:${id}`]);
    if (!b64) return new Response(null, { status: 404 });
    // A URL leva ?v=atualizadoEm, então a mesma URL é sempre a mesma imagem.
    return new Response(Buffer.from(b64, "base64"), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=31536000, immutable" } });
  }

  if (id) {
    const [p] = await redis<string | null>(["GET", "rt:post:" + id]);
    return p ? json({ id, ...JSON.parse(p) }) : json({ erro: "não encontrado" }, 404);
  }

  // ponytail: lista os 300 mais novos de uma vez; paginar quando passar disso.
  const [ids = []] = await redis<string[]>(["ZRANGE", "rt:posts", 0, LIMITE_LISTA - 1, "REV"]);
  if (!ids.length) return json({ posts: [] });
  const [docs = []] = await redis<(string | null)[]>(["MGET", ...ids.map((i) => "rt:post:" + i)]);
  const posts = docs.flatMap((d, k) => {
    if (!d) return [];
    const { artigo, ...resto } = JSON.parse(d); // o artigo vem só ao abrir o post
    return [{ id: ids[k], ...resto }];
  });
  return json({ posts });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const corpo = await request.json().catch(() => null);
  if (corpo?.acao === "publicar") {
    if (!autorizado(cookies.get(COOKIE)?.value)) return json({ erro: "senha" }, 401);
    return publicar(corpo);
  }
  if (corpo?.acao === "sair") {
    cookies.delete(COOKIE, { path: "/api/operacao" });
    return json({ ok: true });
  }
  if (corpo?.acao !== "entrar" || typeof corpo.senha !== "string") return json({ erro: "pedido" }, 400);
  const esperado = process.env.SENHA_EQUIPE;
  const a = Buffer.from(corpo.senha), b = Buffer.from(esperado ?? "");
  if (!esperado || a.length !== b.length || !timingSafeEqual(a, b)) {
    await new Promise((ok) => setTimeout(ok, 800)); // freia tentativa de adivinhar
    return json({ erro: "senha" }, 401);
  }
  cookies.set(COOKIE, token(), { path: "/api/operacao", httpOnly: true, secure: true, sameSite: "strict", maxAge: 60 * 60 * 24 * 30 });
  return json({ ok: true });
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  if (!autorizado(cookies.get(COOKIE)?.value)) return json({ erro: "senha" }, 401);
  const r = salvarSchema.safeParse(await request.json().catch(() => null));
  if (!r.success) return json({ erro: "dados", detalhe: r.error.issues.slice(0, 3) }, 400);
  const { post, thumb, foto } = r.data;
  const id = r.data.id ?? randomUUID();
  const doc = { ...post, temFoto: foto === undefined ? post.temFoto : foto !== null, atualizadoEm: new Date().toISOString() };
  if (r.data.id) {
    // Status só muda pelo PATCH: quem salva o texto não desfaz o "publicado" que outra pessoa marcou.
    const [atual] = await redis<string | null>(["GET", "rt:post:" + id]);
    if (atual) {
      const { siteStatus, publicadoEm, siteSlug, igStatus, igPublicadoEm, criadoEm } = JSON.parse(atual);
      Object.assign(doc, { siteStatus, publicadoEm, siteSlug, igStatus, igPublicadoEm, criadoEm });
    }
  }
  const cmds: (string | number)[][] = [
    ["SET", "rt:post:" + id, JSON.stringify(doc)],
    ["SET", "rt:thumb:" + id, semPrefixo(thumb)],
    ["ZADD", "rt:posts", Date.parse(doc.criadoEm) || Date.now(), id],
  ];
  if (foto) cmds.push(["SET", "rt:foto:" + id, semPrefixo(foto)]);
  else if (foto === null) cmds.push(["DEL", "rt:foto:" + id]);
  await redis(...cmds);
  const { artigo, ...resto } = doc;
  return json({ id, ...resto });
};

// Marca Instagram e site como publicado/pendente. A data é sempre a do servidor.
export const PATCH: APIRoute = async ({ request, cookies }) => {
  if (!autorizado(cookies.get(COOKIE)?.value)) return json({ erro: "senha" }, 401);
  const r = marcarSchema.safeParse(await request.json().catch(() => null));
  if (!r.success) return json({ erro: "dados" }, 400);
  const { id, ig, site } = r.data;
  const [atual] = await redis<string | null>(["GET", "rt:post:" + id]);
  if (!atual) return json({ erro: "não encontrado" }, 404);
  const doc = JSON.parse(atual);
  const agora = new Date().toISOString();
  if (ig) Object.assign(doc, { igStatus: ig, igPublicadoEm: ig === "publicado" ? agora : null });
  if (site) Object.assign(doc, { siteStatus: site, publicadoEm: site === "publicado" ? agora : null });
  // ponytail: ler e regravar sem trava; duas marcações no mesmo segundo podem se sobrepor.
  await redis(["SET", "rt:post:" + id, JSON.stringify(doc)]);
  const { artigo, ...resto } = doc;
  return json({ id, ...resto });
};

// O id vem no corpo JSON: o checkOrigin do Astro recusa DELETE sem Content-Type.
export const DELETE: APIRoute = async ({ request, cookies }) => {
  if (!autorizado(cookies.get(COOKIE)?.value)) return json({ erro: "senha" }, 401);
  const r = z.object({ id: ID }).safeParse(await request.json().catch(() => null));
  if (!r.success) return json({ erro: "id" }, 400);
  const { id } = r.data;
  await redis(["DEL", "rt:post:" + id, "rt:thumb:" + id, "rt:foto:" + id], ["ZREM", "rt:posts", id]);
  return json({ ok: true });
};

// ---------- Publicar no site ----------
const REPO = "https://api.github.com/repos/pxdrik/Revista-Teen-Espro";
const PASTA = "revista-teen-v2/";
const ARQ_APP = PASTA + "src/data/posts-do-app.json";
// Produção grava no main. Um preview pode apontar para um ramo de teste (GITHUB_BRANCH_SITE).
const RAMO = process.env.GITHUB_BRANCH_SITE || "main";

async function gh<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(REPO + caminho, {
    ...init,
    headers: {
      Authorization: "Bearer " + process.env.GITHUB_TOKEN_SITE,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "revista-teen-operacao",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!r.ok) throw Object.assign(new Error("github " + r.status + " " + caminho), { status: r.status });
  return r.json() as Promise<T>;
}
const lerArquivo = async (caminho: string, ref: string) =>
  Buffer.from((await gh<{ content: string }>(`/contents/${caminho}?ref=${ref}`)).content, "base64").toString("utf8");
const blob = (content: string, encoding: "base64" | "utf-8") =>
  gh<{ sha: string }>("/git/blobs", { method: "POST", body: JSON.stringify({ content, encoding }) });

/** O que a tela manda: a matéria como a prévia mostrou. Id, slug, data, foto e crédito saem daqui. */
const pedidoSchema = z.object({
  itens: z.array(z.object({
    id: ID,
    artigo: articleSchema
      .pick({ title: true, subtitle: true, excerpt: true, category: true, tags: true, author: true, readingTime: true, body: true })
      .extend({ alt: z.string().min(10) }),
  })).min(1).max(20),
});
const detalhe = (e: z.ZodError) => e.issues.slice(0, 5).map((i) => i.path.join(".") + ": " + i.message);

const slugDe = (t: string) => {
  const s = t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return s.length <= 60 ? s : s.slice(0, 60).replace(/-[^-]*$/, "");
};
const hojeSP = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

async function publicar(corpo: unknown) {
  if (!process.env.GITHUB_TOKEN_SITE) return json({ erro: "O site ainda não tem a chave do GitHub (GITHUB_TOKEN_SITE)." }, 503);
  const r = pedidoSchema.safeParse(corpo);
  if (!r.success) return json({ erro: "dados", detalhe: detalhe(r.error) }, 400);
  const { itens } = r.data;

  const docs = await redis<string | null>(...itens.map((i) => ["GET", "rt:post:" + i.id]));
  const fotos = await redis<string | null>(...itens.map((i) => ["GET", "rt:foto:" + i.id]));
  for (const [k, d] of docs.entries()) {
    if (!d) return json({ erro: "Um dos posts não existe mais." }, 404);
    if (JSON.parse(d).siteStatus === "publicado") return json({ erro: "Um dos posts já está publicado no site." }, 409);
    if (!fotos[k]) return json({ erro: "Todo post precisa de foto para ir ao site." }, 400);
  }

  // Duas pessoas publicando juntas: se o main andou entre ler e gravar, tenta de novo uma vez.
  for (let tentativa = 0; ; tentativa++) {
    try {
      const base = (await gh<{ object: { sha: string } }>("/git/ref/heads/" + RAMO)).object.sha;
      const [edicao, appTxt] = await Promise.all([lerArquivo(PASTA + "src/data/edition-2026.ts", base), lerArquivo(ARQ_APP, base)]);
      const doApp: ArticleInput[] = JSON.parse(appTxt);
      const ids = [...edicao.matchAll(/^\s+id: (\d+),/gm)].map((m) => Number(m[1])).concat(doApp.map((a) => a.id));
      const slugs = new Set([...edicao.matchAll(/^\s+slug: "([^"]+)"/gm)].map((m) => m[1]).concat(doApp.map((a) => a.slug)));
      const imagens = new Set([...edicao.matchAll(/src: "(\/images\/artigos\/[^"]+)"/g)].map((m) => m[1]).concat(doApp.map((a) => a.image.src)));
      let proximo = Math.max(0, ...ids) + 1;

      const novos: ArticleInput[] = [];
      const arvore: { path: string; sha: string }[] = [];
      for (const [k, { artigo }] of itens.entries()) {
        const raiz = slugDe(artigo.title) || "materia";
        let slug = raiz;
        for (let n = 2; slugs.has(slug) || imagens.has(`/images/artigos/${slug}.jpg`); n++) slug = `${raiz}-${n}`;
        slugs.add(slug);
        const { alt, ...resto } = artigo;
        const novo: ArticleInput = {
          id: proximo++, slug, ...resto, publishedAt: hojeSP(),
          image: { src: `/images/artigos/${slug}.jpg`, alt, credit: "Reprodução" },
        };
        const ok = articleSchema.safeParse(novo);
        if (!ok.success) return json({ erro: "dados", detalhe: detalhe(ok.error) }, 400);
        if (!(novo.category in categoryStyles)) return json({ erro: "Editoria que não existe no site: " + novo.category }, 400);
        novos.push(novo);
        arvore.push({ path: PASTA + "public/images/artigos/" + slug + ".jpg", sha: (await blob(fotos[k]!, "base64")).sha });
      }
      arvore.push({ path: ARQ_APP, sha: (await blob(JSON.stringify([...doApp, ...novos], null, 2) + "\n", "utf-8")).sha });

      const { tree } = await gh<{ tree: { sha: string } }>("/git/commits/" + base);
      const novaArvore = await gh<{ sha: string }>("/git/trees", { method: "POST", body: JSON.stringify({
        base_tree: tree.sha, tree: arvore.map((a) => ({ path: a.path, mode: "100644", type: "blob", sha: a.sha })),
      }) });
      const commit = await gh<{ sha: string }>("/git/commits", { method: "POST", body: JSON.stringify({
        message: ("Publica do app da redação: " + novos.map((a) => a.title).join("; ")).slice(0, 300),
        tree: novaArvore.sha, parents: [base],
      }) });
      // Sem force: se outro commit entrou no ramo, o GitHub recusa (422) e a volta do laço refaz em cima dele.
      await gh("/git/refs/heads/" + RAMO, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });

      // ponytail: se o Redis cair só aqui, a matéria já está no site mas o post fica pendente;
      // publicar de novo duplicaria. Raro o bastante para conferir na mão se acontecer.
      const agora = new Date().toISOString();
      const marcados = docs.map((d, k) => ({ ...JSON.parse(d!), siteStatus: "publicado", publicadoEm: agora, siteSlug: novos[k]!.slug }));
      await redis(...marcados.map((doc, k) => ["SET", "rt:post:" + itens[k]!.id, JSON.stringify(doc)]));
      return json({ publicados: marcados.map(({ artigo, ...resto }, k) => ({ id: itens[k]!.id, ...resto })) });
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 422 && tentativa === 0) continue;
      console.error("publicar", e);
      return json({ erro: status === 401 || status === 403 || status === 404
        ? "A chave do GitHub foi recusada. Confira GITHUB_TOKEN_SITE."
        : "Não consegui publicar agora. Nada foi para o site." }, 502);
    }
  }
}
