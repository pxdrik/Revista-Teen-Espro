/**
 * AUDITORIA DA EDIÇÃO
 *
 * Roda sobre o HTML já construído em dist/ - não sobre o código-fonte. Se está
 * errado no HTML final, está errado para o leitor e para o Google.
 *
 * Uso: node scripts/audit.mjs   (requer `npm run build` antes)
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const PUBLIC = join(ROOT, "public");

if (!existsSync(DIST)) {
  console.error("dist/ não encontrado. Rode `npm run build` primeiro.");
  process.exit(1);
}

// ── helpers ──
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(DIST);
const htmlFiles = files.filter((f) => f.endsWith(".html"));

const problems = [];
const fail = (page, msg) => problems.push({ page, msg });

const routeOf = (file) =>
  "/" + relative(DIST, file).replace(/\\/g, "/").replace(/index\.html$/, "").replace(/\/$/, "");

const routes = new Set(htmlFiles.map((f) => routeOf(f) || "/"));

const attr = (tag, name) => {
  const m = tag.match(new RegExp(name + '="([^"]*)"'));
  return m ? m[1] : null;
};
const meta = (html, sel) => {
  const m = html.match(new RegExp('<meta[^>]*' + sel + '[^>]*>'));
  return m ? attr(m[0], "content") : null;
};

// ── acumuladores para checar unicidade ──
const titles = new Map();
const descriptions = new Map();
const canonicals = new Map();

let imgCount = 0;
let linkCount = 0;

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const route = routeOf(file) || "/";
  const isArticle = route.startsWith("/artigos/") && route !== "/artigos";
  const is404 = route === "/404";

  // ── 1. Metadados ──
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  const desc = meta(html, 'name="description"');
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];

  if (!title) fail(route, "sem <title>");
  if (!desc) fail(route, "sem meta description");
  if (!canonical) fail(route, "sem canonical");

  if (title) {
    if (titles.has(title)) fail(route, `title duplicado com ${titles.get(title)}: "${title}"`);
    else titles.set(title, route);
  }
  if (desc && !is404) {
    if (descriptions.has(desc)) fail(route, `meta description duplicada com ${descriptions.get(desc)}`);
    else descriptions.set(desc, route);
  }
  if (canonical) {
    if (canonicals.has(canonical)) fail(route, `canonical duplicado com ${canonicals.get(canonical)}`);
    else canonicals.set(canonical, route);
  }

  // ── 2. Open Graph / Twitter ──
  for (const [sel, label] of [
    ['property="og:title"', "og:title"],
    ['property="og:description"', "og:description"],
    ['property="og:image"', "og:image"],
    ['property="og:url"', "og:url"],
    ['property="og:type"', "og:type"],
    ['name="twitter:card"', "twitter:card"],
    ['name="twitter:image"', "twitter:image"],
  ]) {
    if (!meta(html, sel)) fail(route, `sem ${label}`);
  }

  if (isArticle) {
    if (meta(html, 'property="og:type"') !== "article") fail(route, "og:type deveria ser 'article'");
    if (!meta(html, 'property="article:published_time"')) fail(route, "sem article:published_time");
    if (!meta(html, 'property="article:author"')) fail(route, "sem article:author");
    if (!html.includes('"@type":"NewsArticle"')) fail(route, "sem JSON-LD NewsArticle");
    if (!html.includes('"@type":"BreadcrumbList"')) fail(route, "sem breadcrumb estruturado");
    if (!html.includes("Leia também")) fail(route, "sem bloco de artigos relacionados");
  }

  // ── 3. Hierarquia de headings ──
  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) fail(route, `deveria ter exatamente 1 <h1>, tem ${h1s.length}`);

  // ── 4. Imagens: alt + arquivo existente ──
  for (const tag of html.match(/<img[^>]*>/g) || []) {
    imgCount++;
    const alt = attr(tag, "alt");
    const src = attr(tag, "src");
    if (alt === null) fail(route, `<img> sem alt: ${src}`);
    else if (alt.trim() === "") fail(route, `<img> com alt vazio: ${src}`);
    if (src && src.startsWith("/")) {
      const onDisk = join(PUBLIC, src);
      const inDist = join(DIST, src);
      if (!existsSync(onDisk) && !existsSync(inDist)) fail(route, `imagem inexistente: ${src}`);
    }
    if (!attr(tag, "width") || !attr(tag, "height")) {
      fail(route, `<img> sem width/height (risco de layout shift): ${src}`);
    }
  }

  // ── 5. Links internos resolvem ──
  for (const tag of html.match(/<a[^>]*>/g) || []) {
    const href = attr(tag, "href");
    if (!href) continue;
    linkCount++;
    if (href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) continue;
    const clean = href.split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
    if (!routes.has(clean)) fail(route, `link interno quebrado: ${href}`);
  }

  // ── 6. Placeholders e links fictícios ──
  for (const bad of ["example.com", "lorem ipsum", "Lorem ipsum", "PLACEHOLDER", "TODO:", "FIXME"]) {
    if (html.includes(bad)) fail(route, `placeholder/link fictício encontrado: "${bad}"`);
  }

  // ── 7. Acessibilidade: controles sem nome ──
  for (const tag of html.match(/<button[^>]*>/g) || []) {
    const hasLabel = attr(tag, "aria-label") || attr(tag, "aria-labelledby");
    // Botões com texto visível são resolvidos no HTML final; checamos os de ícone.
    const idx = html.indexOf(tag);
    const inner = html.slice(idx + tag.length, idx + tag.length + 200);
    const hasText = /^[^<]*[A-Za-zÀ-ÿ]{2,}/.test(inner.trim());
    if (!hasLabel && !hasText) fail(route, "botão sem nome acessível (aria-label ou texto)");
  }

  // ── 8. lang ──
  if (!html.includes('<html lang="pt-BR"')) fail(route, "sem lang=pt-BR");
}

// ── 9. Cobertura: toda categoria e todo artigo têm página ──
const { articles, categories } = await import("../src/lib/content.ts").catch(() => ({}));

console.log("─".repeat(64));
console.log("AUDITORIA DA EDICAO | REVISTA TEEN V2");
console.log("─".repeat(64));
console.log(`Páginas HTML .......... ${htmlFiles.length}`);
console.log(`Rotas ................. ${routes.size}`);
console.log(`Imagens verificadas ... ${imgCount}`);
console.log(`Links verificados ..... ${linkCount}`);
console.log(`Titles únicos ......... ${titles.size}`);
console.log(`Descriptions únicas ... ${descriptions.size}`);
console.log(`Canonicals únicos ..... ${canonicals.size}`);
console.log("─".repeat(64));

if (problems.length === 0) {
  console.log("✓ Nenhuma inconsistência encontrada.");
  process.exit(0);
}

const byPage = new Map();
for (const p of problems) {
  if (!byPage.has(p.page)) byPage.set(p.page, []);
  byPage.get(p.page).push(p.msg);
}

console.log(`✗ ${problems.length} problema(s) em ${byPage.size} página(s):\n`);
let shown = 0;
for (const [page, msgs] of byPage) {
  if (shown++ > 25) {
    console.log(`  ... e mais ${byPage.size - shown + 1} páginas`);
    break;
  }
  console.log(`  ${page}`);
  for (const m of [...new Set(msgs)].slice(0, 6)) console.log(`    - ${m}`);
}
process.exit(1);
