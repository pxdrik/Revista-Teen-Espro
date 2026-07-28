/**
 * Contrato da base editorial.
 *
 * O schema roda em tempo de BUILD. Se a edição tiver slug duplicado, categoria sem
 * estilo, imagem repetida ou corpo fora do formato, o build falha - em vez de virar
 * um bug silencioso em produção, como acontecia na V1.
 */
import { z } from "zod";

/** Aparência da editoria. A LISTA de editorias nunca vem daqui - vem dos artigos. */
export const categoryStyleSchema = z.object({
  name: z.string().min(1),
  emoji: z.string().min(1),
  /** Hex usado em badges, filtros e detalhes. Fonte única da cor da editoria. */
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "cor deve ser hex #RRGGBB"),
});

export type CategoryStyle = z.infer<typeof categoryStyleSchema>;

export const authorSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
});

export const imageSchema = z.object({
  src: z.string().startsWith("/images/artigos/"),
  /** Descreve a imagem para quem não a enxerga. Nunca repete o título. */
  alt: z.string().min(10),
  /** Detentor dos direitos. Obrigatório: sem crédito não publica. */
  credit: z.string().min(1),
});

const SLUG_RX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const articleSchema = z.object({
  id: z.number().int().positive(),
  slug: z.string().regex(SLUG_RX, "slug deve ser kebab-case e URL-safe"),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  excerpt: z.string().min(20),
  category: z.string().regex(SLUG_RX),
  tags: z.array(z.string().min(1)).min(2, "mínimo de 2 tags por artigo"),
  author: authorSchema,
  publishedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data deve ser YYYY-MM-DD"),
  readingTime: z.number().int().min(1).max(60),
  image: imageSchema,
  /** Introdução, Contextualização, Desenvolvimento, Conclusão. */
  body: z.array(z.string().min(40)).length(4, "o corpo precisa ter 4 parágrafos"),
  /** Sobrescreve a seleção automática de relacionados, quando houver decisão editorial. */
  relatedSlugs: z.array(z.string()).max(3).optional(),
  /**
   * Fecha a capa manualmente. Opcional: sem nenhum `cover`, o hero é 100% automático.
   * No máximo um artigo por edição pode marcar true (validado no content layer).
   */
  cover: z.boolean().optional(),
});

export type ArticleInput = z.input<typeof articleSchema>;

/** Artigo já validado e enriquecido pelo content layer. */
export interface Article extends z.infer<typeof articleSchema> {
  /** Editoria resolvida (slug + apresentação). */
  categoryRef: Category;
  /** Peso editorial calculado - define hero, destaques e ordem de "Em Alta". */
  score: number;
  /** URL canônica relativa. */
  href: string;
}

export interface Category {
  slug: string;
  name: string;
  emoji: string;
  color: string;
  /** Quantidade de artigos nesta edição. Nunca pode ser 0. */
  count: number;
  href: string;
}
