/**
 * VERIFICADOR DE FONTES EXTERNAS
 *
 * Testa por HTTP todos os links de `sources` da base editorial. Link de fonte
 * apodrece: veiculo reorganiza o site, tira a materia do ar, muda de dominio.
 * Um link quebrado numa revista publicada e pior do que nenhum link, porque
 * sugere apuracao que o leitor nao consegue conferir.
 *
 * Uso: npm run check:sources
 *
 * Nao roda junto do build de proposito: depende de rede e de sites de terceiros,
 * entao uma instabilidade alheia nao pode derrubar a publicacao. Rode antes de
 * fechar uma edicao.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = readFileSync(join(ROOT, "src/data/edition-2026.ts"), "utf8");

// Extrai slug + fontes sem precisar compilar TypeScript.
const artigos = [];
const re = /slug: "([^"]+)",\s*\n\s*sources: \[([\s\S]*?)\n {4}\],/g;
let m;
while ((m = re.exec(raw)) !== null) {
  const slug = m[1];
  const fontes = [...m[2].matchAll(/outlet: "([^"]+)", url: "([^"]+)"/g)].map((f) => ({
    outlet: f[1],
    url: f[2],
  }));
  artigos.push({ slug, fontes });
}

const total = artigos.reduce((n, a) => n + a.fontes.length, 0);
console.log("─".repeat(70));
console.log("VERIFICACAO DE FONTES | REVISTA TEEN");
console.log("─".repeat(70));
console.log(`Materias com fonte .... ${artigos.length}`);
console.log(`Links a testar ........ ${total}`);
console.log("─".repeat(70));

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

async function testar(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    });
    return r.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(t);
  }
}

const quebrados = [];
const bloqueados = [];

for (const artigo of artigos) {
  for (const fonte of artigo.fontes) {
    const status = await testar(fonte.url);
    // 403 e 429 costumam ser bloqueio a robo, nao link morto: sinalizamos
    // para conferencia manual em vez de tratar como falha.
    if (status === 403 || status === 429) {
      bloqueados.push({ ...fonte, slug: artigo.slug, status });
      console.log(`  ?  ${status}  ${artigo.slug} -> ${fonte.outlet}`);
    } else if (status >= 200 && status < 400) {
      console.log(`  ok ${status}  ${artigo.slug} -> ${fonte.outlet}`);
    } else {
      quebrados.push({ ...fonte, slug: artigo.slug, status });
      console.log(`  X  ${status}  ${artigo.slug} -> ${fonte.outlet}  ${fonte.url}`);
    }
  }
}

console.log("─".repeat(70));
if (bloqueados.length) {
  console.log(`${bloqueados.length} link(s) responderam com bloqueio a robo. Conferir no navegador:`);
  for (const b of bloqueados) console.log(`  ${b.slug}  ${b.url}`);
}
if (quebrados.length === 0) {
  console.log("✓ Nenhum link de fonte quebrado.");
  process.exit(0);
}
console.log(`✗ ${quebrados.length} link(s) de fonte quebrado(s):`);
for (const q of quebrados) console.log(`  ${q.slug}  [${q.status}]  ${q.url}`);
process.exit(1);
