/**
 * CONTENT LAYER - a única fonte de verdade derivada da edição.
 *
 * Tudo que o site mostra (header, home, rodapé, busca, páginas de categoria,
 * relacionados, sitemap) sai daqui. Nenhuma página monta a própria lista de
 * categorias nem repete regra de negócio.
 *
 * Este módulo roda em tempo de build. Qualquer violação de integridade lança
 * erro e derruba o build, que é exatamente o comportamento desejado: é melhor
 * quebrar a publicação do que publicar uma revista inconsistente.
 */
import { articles as rawArticles, categoryStyles } from "@/data/edition-2026";
import { articleSchema, categoryStyleSchema, type Article, type Category } from "./schema";

// ─────────────────────────────────────────────────────────────
// 1. Validação
// ─────────────────────────────────────────────────────────────

function fail(message: string): never {
  throw new Error(
    "[Revista Teen] Edição inválida: " + message + "\n" +
      "Corrija src/data/edition-2026.ts. O build não continua com a base inconsistente.",
  );
}

for (const [slug, style] of Object.entries(categoryStyles)) {
  const parsed = categoryStyleSchema.safeParse(style);
  if (!parsed.success) {
    fail('estilo da categoria "' + slug + '": ' + parsed.error.issues.map((i) => i.message).join("; "));
  }
}

const validated = rawArticles.map((raw) => {
  const parsed = articleSchema.safeParse(raw);
  if (!parsed.success) {
    const where = typeof raw?.slug === "string" ? raw.slug : "sem slug";
    fail(
      'artigo "' + where + '": ' +
        parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; "),
    );
  }
  return parsed.data;
});

// ─────────────────────────────────────────────────────────────
// 2. Integridade referencial
// ─────────────────────────────────────────────────────────────

const seenSlugs = new Set<string>();
const seenIds = new Set<number>();
const seenImages = new Set<string>();

for (const a of validated) {
  if (seenSlugs.has(a.slug)) fail('slug duplicado: "' + a.slug + '"');
  seenSlugs.add(a.slug);

  if (seenIds.has(a.id)) fail("id duplicado: " + a.id);
  seenIds.add(a.id);

  // Imagem repetida entre assuntos diferentes foi um dos bugs da V1.
  if (seenImages.has(a.image.src)) fail('imagem reutilizada em mais de um artigo: "' + a.image.src + '"');
  seenImages.add(a.image.src);

  if (!(a.category in categoryStyles)) {
    fail('artigo "' + a.slug + '" usa a categoria "' + a.category + '", que não existe em categoryStyles');
  }
}

// Estilo declarado sem nenhum artigo = categoria órfã (bug da V1).
const usedCategories = new Set(validated.map((a) => a.category));
for (const slug of Object.keys(categoryStyles)) {
  if (!usedCategories.has(slug)) {
    fail('categoria órfã: "' + slug + '" está declarada mas nenhum artigo a utiliza');
  }
}

// Override editorial de relacionados precisa apontar para artigos que existem.
for (const a of validated) {
  for (const rel of a.relatedSlugs ?? []) {
    if (!seenSlugs.has(rel)) fail('artigo "' + a.slug + '" referencia relacionado inexistente: "' + rel + '"');
    if (rel === a.slug) fail('artigo "' + a.slug + '" referencia a si mesmo como relacionado');
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Datas
// ─────────────────────────────────────────────────────────────

/**
 * "2026-06-14" precisa ser lido como meia-noite LOCAL. Passar a string direta para
 * new Date() a interpreta como UTC e, em fusos atrás de Greenwich, exibe o dia anterior.
 */
export function parseDate(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

export function formatDate(iso: string, style: "short" | "long" = "short"): string {
  return parseDate(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
  });
}

// ─────────────────────────────────────────────────────────────
// 4. Score editorial (hero e destaques automáticos)
// ─────────────────────────────────────────────────────────────

const categoryCounts = new Map<string, number>();
for (const a of validated) categoryCounts.set(a.category, (categoryCounts.get(a.category) ?? 0) + 1);

const times = validated.map((a) => parseDate(a.publishedAt).getTime());
const oldest = Math.min(...times);
const newest = Math.max(...times);
const span = Math.max(1, newest - oldest);

/**
 * Afinidade entre duas matérias, calculada só a partir dos dados editoriais
 * (editoria, tags e proximidade de data). Não depende de score, para o cálculo de
 * centralidade abaixo não virar circular.
 */
function affinity(a: (typeof validated)[number], b: (typeof validated)[number]): number {
  const sameCategory = a.category === b.category ? 5 : 0;
  const tagsB = new Set(b.tags);
  const shared = a.tags.reduce((n, t) => n + (tagsB.has(t) ? 1 : 0), 0) * 2;
  const closeness =
    1 - Math.min(Math.abs(parseDate(a.publishedAt).getTime() - parseDate(b.publishedAt).getTime()) / span, 1);
  return sameCategory + shared + closeness;
}

/**
 * Centralidade = in-degree no grafo de relacionados.
 *
 * Para cada matéria, olhamos suas 3 mais afins e registramos um "voto" para cada
 * uma. A matéria que mais recebe votos é aquela para a qual a edição inteira aponta
 * - o centro de gravidade da edição, e portanto a capa.
 *
 * É um sinal melhor do que somar frequência de tags, que premiava tags genéricas
 * ("Estreia", "Fase de Grupos") e elegia nota de jogo como manchete.
 */
const inDegree = new Map<string, number>();
for (const a of validated) {
  const top = validated
    .filter((b) => b.slug !== a.slug)
    .map((b) => ({ b, s: affinity(a, b) }))
    .sort((x, y) => y.s - x.s)
    .slice(0, 3);
  for (const { b } of top) inDegree.set(b.slug, (inDegree.get(b.slug) ?? 0) + 1);
}
const maxInDegree = Math.max(1, ...inDegree.values());

/**
 * Peso editorial, 100% derivado da base - nada de flag "featured" escrita à mão.
 *
 *  - centralidade: quantas matérias da edição apontam para esta (in-degree);
 *  - ênfase: quantas matérias a edição dedica àquela editoria;
 *  - atualidade: matéria mais recente pesa mais.
 *
 * Tempo de leitura foi descartado de propósito: reportagem longa não é sinônimo de
 * manchete - um review extenso vencia a cobertura factual de um grande evento.
 */
function editorialScore(a: (typeof validated)[number]): number {
  const centrality = (inDegree.get(a.slug) ?? 0) / maxInDegree; // 0..1
  const emphasis = (categoryCounts.get(a.category) ?? 1) / validated.length; // 0..1
  const recency = (parseDate(a.publishedAt).getTime() - oldest) / span; // 0..1
  return centrality * 3 + emphasis * 2 + recency * 1;
}

// ─────────────────────────────────────────────────────────────
// 5. Taxonomia derivada
// ─────────────────────────────────────────────────────────────

export const categories: Category[] = Object.keys(categoryStyles)
  .map((slug) => {
    const style = categoryStyles[slug]!;
    return {
      slug,
      name: style.name,
      emoji: style.emoji,
      color: style.color,
      count: categoryCounts.get(slug) ?? 0,
      href: "/categoria/" + slug,
    };
  })
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));

const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

export function getCategory(slug: string): Category | undefined {
  return categoryBySlug.get(slug);
}

// ─────────────────────────────────────────────────────────────
// 6. Artigos enriquecidos
// ─────────────────────────────────────────────────────────────

export const articles: Article[] = validated
  .map((a) => ({
    ...a,
    categoryRef: categoryBySlug.get(a.category)!,
    score: editorialScore(a),
    href: "/artigos/" + a.slug,
  }))
  .sort((a, b) => parseDate(b.publishedAt).getTime() - parseDate(a.publishedAt).getTime());

const articleBySlug = new Map(articles.map((a) => [a.slug, a]));

export function getArticle(slug: string): Article | undefined {
  return articleBySlug.get(slug);
}

export function getArticlesByCategory(slug: string): Article[] {
  return articles.filter((a) => a.category === slug);
}

/** Todas as tags da edição, com contagem, ordenadas por frequência. */
export const tags: { name: string; count: number }[] = (() => {
  const counts = new Map<string, number>();
  for (const a of articles) for (const t of a.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
})();

// ─────────────────────────────────────────────────────────────
// 7. Curadoria automática da home
// ─────────────────────────────────────────────────────────────

const byScore = [...articles].sort((a, b) => b.score - a.score);

// No máximo uma capa fechada manualmente por edição.
const covers = articles.filter((a) => a.cover);
if (covers.length > 1) {
  fail("mais de um artigo marcado com cover: true (" + covers.map((a) => a.slug).join(", ") + ")");
}

/**
 * Capa da edição.
 *
 * Padrão: a matéria de maior peso editorial calculado (`byScore[0]`) - totalmente
 * automática. Se a redação marcar `cover: true` em um artigo, essa decisão vence.
 * O override vive na base editorial, nunca em componente do site: nenhuma página
 * conhece o slug da capa.
 */
export const heroArticle: Article = covers[0] ?? byScore[0]!;

/** O que o algoritmo escolheria sozinho - útil para conferir a curadoria. */
export const automaticCover: Article = byScore[0]!;

/**
 * Destaques: os próximos melhores colocados, no máximo um por editoria, para a
 * capa não virar monotemática.
 */
export const featuredArticles: Article[] = (() => {
  const out: Article[] = [];
  const usedCats = new Set([heroArticle.category]);
  for (const a of byScore) {
    if (out.length >= 3) break;
    if (a.slug === heroArticle.slug || usedCats.has(a.category)) continue;
    out.push(a);
    usedCats.add(a.category);
  }
  return out;
})();

/** "Em Alta": maior peso editorial, já descontando o que apareceu acima. */
export const trendingArticles: Article[] = (() => {
  const used = new Set([heroArticle.slug, ...featuredArticles.map((a) => a.slug)]);
  return byScore.filter((a) => !used.has(a.slug)).slice(0, 4);
})();

/** "Últimas": mais recentes que ainda não apareceram na página. */
export const latestArticles: Article[] = (() => {
  const used = new Set([
    heroArticle.slug,
    ...featuredArticles.map((a) => a.slug),
    ...trendingArticles.map((a) => a.slug),
  ]);
  return articles.filter((a) => !used.has(a.slug)).slice(0, 6);
})();

// ─────────────────────────────────────────────────────────────
// 8. Relacionados
// ─────────────────────────────────────────────────────────────

/**
 * Relacionados por afinidade real: mesma editoria vale mais, tags em comum somam,
 * proximidade de data desempata. Sempre retorna `count` itens enquanto houver
 * edição suficiente - editoria com um único artigo não fica com bloco vazio.
 */
export function getRelated(article: Article, count = 3): Article[] {
  if (article.relatedSlugs?.length) {
    const picked = article.relatedSlugs.map((s) => articleBySlug.get(s)!).filter(Boolean);
    if (picked.length >= count) return picked.slice(0, count);
  }

  const tagSet = new Set(article.tags);
  const base = parseDate(article.publishedAt).getTime();

  return articles
    .filter((a) => a.slug !== article.slug)
    .map((a) => {
      const sameCategory = a.category === article.category ? 5 : 0;
      const shared = a.tags.reduce((n, t) => n + (tagSet.has(t) ? 1 : 0), 0) * 2;
      const closeness = 1 - Math.min(Math.abs(parseDate(a.publishedAt).getTime() - base) / span, 1);
      return { a, s: sameCategory + shared + closeness };
    })
    .sort((x, y) => y.s - x.s || y.a.score - x.a.score)
    .slice(0, count)
    .map((x) => x.a);
}

// ─────────────────────────────────────────────────────────────
// 9. Índice de busca (consumido pela ilha React)
// ─────────────────────────────────────────────────────────────

export interface SearchDoc {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: string;
  categoryName: string;
  categoryColor: string;
  categoryEmoji: string;
  tags: string[];
  author: string;
  publishedAt: string;
  dateLabel: string;
  readingTime: number;
  image: string;
  imageAlt: string;
  href: string;
  /** Chave pré-normalizada (sem acento, minúscula) para busca client-side barata. */
  haystack: string;
}

export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export const searchIndex: SearchDoc[] = articles.map((a) => ({
  slug: a.slug,
  title: a.title,
  subtitle: a.subtitle,
  excerpt: a.excerpt,
  category: a.category,
  categoryName: a.categoryRef.name,
  categoryColor: a.categoryRef.color,
  categoryEmoji: a.categoryRef.emoji,
  tags: a.tags,
  author: a.author.name,
  publishedAt: a.publishedAt,
  dateLabel: formatDate(a.publishedAt),
  readingTime: a.readingTime,
  image: a.image.src,
  imageAlt: a.image.alt,
  href: a.href,
  // Busca cobre exatamente o que foi prometido: título, subtítulo, resumo,
  // categoria e tags (autor incluído como bônus útil na redação).
  haystack: normalize(
    [a.title, a.subtitle, a.excerpt, a.categoryRef.name, a.tags.join(" "), a.author.name].join(" "),
  ),
}));

/** Metadados da edição, usados em SEO e no rodapé. */
export const edition = {
  name: "Edição 2026",
  totalArticles: articles.length,
  totalCategories: categories.length,
  updatedAt: articles[0]?.publishedAt ?? "",
};
