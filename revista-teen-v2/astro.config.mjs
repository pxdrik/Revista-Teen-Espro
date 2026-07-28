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
export default defineConfig({
  site: process.env.SITE_URL ?? "https://revistateen.com.br",
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
