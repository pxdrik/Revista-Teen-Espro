/**
 * Fila do site no app da redação (/redacao-345590b4), lida pela mesma rota que o app usa.
 *
 *   node scripts/fila-do-app.mjs              baixa os posts pendentes para .fila-do-app/
 *   node scripts/fila-do-app.mjs marcar <id>  marca posts como publicados no site
 *
 * Senha: SENHA_EQUIPE, ou SENHA_EQUIPE_FILE com o caminho do arquivo (via .env).
 * Passo a passo completo em docs/como-postar-do-docs.md.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

try {
  process.loadEnvFile?.();
} catch {
  // sem .env, segue só com as variáveis do ambiente
}
const BASE = (process.env.SITE_APP ?? "https://revista-teen-espro.vercel.app") + "/api/operacao";
const SENHA = process.env.SENHA_EQUIPE ?? (process.env.SENHA_EQUIPE_FILE && readFileSync(process.env.SENHA_EQUIPE_FILE, "utf8").trim());
if (!SENHA) {
  console.error("Defina SENHA_EQUIPE ou SENHA_EQUIPE_FILE (no .env).");
  process.exit(1);
}
const PASTA = ".fila-do-app";

const entrar = await fetch(BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "entrar", senha: SENHA }) });
if (!entrar.ok) {
  console.error("Não entrou no app: " + entrar.status + (entrar.status === 401 ? " (senha errada)" : ""));
  process.exit(1);
}
const cookie = entrar.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
async function api(metodo, query = "", corpo) {
  const r = await fetch(BASE + query, {
    method: metodo,
    headers: { Cookie: cookie, ...(corpo ? { "Content-Type": "application/json" } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!r.ok) throw new Error(metodo + " " + query + ": " + r.status);
  return r;
}

const [acao, ...ids] = process.argv.slice(2);
if (acao === "marcar") {
  if (!ids.length) throw new Error("Passe o id de pelo menos um post.");
  for (const id of ids) {
    const p = await (await api("PATCH", "", { id, site: "publicado" })).json();
    console.log("publicado no site: " + p.site.titulo);
  }
} else {
  const { posts } = await (await api("GET")).json();
  const fila = posts.filter((p) => p.siteStatus !== "publicado").reverse(); // mais antigo primeiro
  rmSync(PASTA, { recursive: true, force: true });
  mkdirSync(PASTA);
  for (const resumo of fila) {
    const p = await (await api("GET", "?id=" + resumo.id)).json();
    writeFileSync(`${PASTA}/${p.id}.json`, JSON.stringify(p, null, 2));
    if (p.temFoto) writeFileSync(`${PASTA}/${p.id}.jpg`, Buffer.from(await (await api("GET", `?img=foto&id=${p.id}&v=0`)).arrayBuffer()));
    console.log([p.id, p.editoria, p.autor || "(sem autor)", p.fonte || "(sem fonte)", p.temFoto ? "foto" : "SEM FOTO", p.site.titulo].join(" | "));
  }
  console.log(`${fila.length} post(s) pendente(s) em ${PASTA}/`);
}
