import type { APIRoute } from "astro";

// Gerado no build a partir de `site` (astro.config.mjs), o mesmo domínio do canonical e do
// sitemap. O arquivo fixo antigo apontava para revistateen.com.br, que é outro site.
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL("sitemap-index.xml", site)}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
