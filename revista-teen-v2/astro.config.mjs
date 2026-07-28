// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

/**
 * Static output: every article is pre-rendered to HTML at build time, so titles,
 * canonical URLs and Open Graph tags exist in the markup that crawlers and social
 * scrapers actually read - they never execute JavaScript.
 *
 * `site` must be the real production origin: canonical URLs, og:url and the sitemap
 * are all derived from it.
 *
 * Sem integração de framework: nenhuma parte da revista precisou de ilha. Busca,
 * filtros e menu são enhancement progressivo em ~40 linhas de TypeScript puro, o
 * que evita duplicar o componente de card e mantém o JS enviado perto de zero.
 * Para adicionar uma ilha depois: `npx astro add react`.
 */
/**
 * Origem publica do site. Canonical, og:url e sitemap derivam daqui, entao ela
 * precisa ser a URL real onde a revista esta hospedada.
 *
 * Ordem de precedencia:
 *  1. SITE_URL, quando o dominio proprio ja estiver configurado;
 *  2. VERCEL_PROJECT_PRODUCTION_URL, o dominio estavel do projeto na Vercel;
 *  3. VERCEL_URL, a URL unica daquele deploy (usada em previews);
 *  4. localhost, para build local.
 *
 * Nunca deixar um dominio chumbado aqui: apontar canonical para um dominio que
 * nao e o nosso entrega o SEO da revista para outro site.
 */
function resolveSite() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:4321";
}

export default defineConfig({
  site: resolveSite(),
  output: "static",
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    // Cover art is already optimised ahead of time; keep the build fast and lossless.
    responsiveStyles: true,
  },
  build: {
    inlineStylesheets: "auto",
  },
});
