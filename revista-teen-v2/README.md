# Revista Teen, V2

Revista digital para jovens de 14 a 24 anos. Reconstruída do zero em Astro, mantendo
a identidade visual da V1 (paleta, tipografia, cards, animações, hero).

## Como rodar

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # GA + build; HTML estático em dist/client, saída da Vercel em .vercel/output
npm run preview    # serve o build
npm run check      # typecheck (Astro + TypeScript)
npm run audit:content   # auditoria do HTML construído (rodar após build)
```

---

## Publicar no site

- **Posts novos da semana** (do app da redação e do Google Docs): siga
  `docs/como-postar-do-docs.md`.
- **Enviar:** `bash scripts/sync-github.sh "mensagem"`. Valida, copia o projeto para a
  pasta `revista-teen-v2/` de `pxdrik/Revista-Teen-Espro` e faz o push, que dispara o
  deploy na Vercel (revista-teen-espro.vercel.app). Este git local não tem remote.

## Publicar uma nova edição

**Troque um arquivo:** `src/data/edition-2026.ts`.

Nada mais precisa mudar. Header, home, rodapé, busca, páginas de categoria, artigos
relacionados, breadcrumbs, sitemap e metadados são todos derivados dele.

1. Substitua o array `articles` pelas matérias da nova edição.
2. Ajuste `categoryStyles` para conter **exatamente** as editorias usadas.
3. Coloque as imagens em `public/images/artigos/<slug>.jpg`.
4. `npm run build && npm run audit:content`.

Se algo estiver inconsistente, **o build falha** com a mensagem exata do problema -
em vez de publicar uma revista quebrada.

### Regras validadas em tempo de build

| Regra | Onde |
| --- | --- |
| `slug` único, kebab-case e URL-safe | `src/lib/schema.ts` |
| `id` único | `src/lib/content.ts` |
| Imagem nunca reutilizada entre matérias | `src/lib/content.ts` |
| Toda categoria usada tem estilo declarado | `src/lib/content.ts` |
| Todo estilo declarado tem ao menos 1 matéria (zero categorias órfãs) | `src/lib/content.ts` |
| Corpo com exatamente 4 parágrafos | `src/lib/schema.ts` |
| Mínimo de 2 tags por matéria | `src/lib/schema.ts` |
| `alt` de imagem com no mínimo 10 caracteres | `src/lib/schema.ts` |
| Crédito de imagem obrigatório | `src/lib/schema.ts` |
| Data no formato `YYYY-MM-DD` | `src/lib/schema.ts` |
| No máximo um artigo com `cover: true` | `src/lib/content.ts` |
| Relacionado manual precisa existir e não ser o próprio artigo | `src/lib/content.ts` |
| Evento aponta para editoria existente | `src/pages/eventos.astro` |

---

## Arquitetura

```
src/
  data/
    edition-2026.ts   ← ÚNICA FONTE DE VERDADE (trocar por edição)
    eventos.ts        ← agenda (só eventos reais, com link oficial)
    views.json        ← visualizações do GA, gerado a cada build (fora do git)
  lib/
    schema.ts         ← contrato Zod da base
    content.ts        ← valida, deriva taxonomia, calcula curadoria
  components/         ← Header, Footer, ArticleCard, CategoryBadge, Breadcrumb, CookieConsent
  layouts/
    BaseLayout.astro  ← <head>, SEO, JSON-LD, aviso de cookies
  pages/
    index.astro           /
    artigos/index.astro   /artigos
    artigos/[slug].astro  /artigos/<slug>       (uma por matéria: 99 em 02/10/2026)
    categoria/[slug].astro /categoria/<slug>    (3 editorias)
    busca.astro           /busca
    eventos.astro         /eventos
    robots.txt.ts         /robots.txt (aponta para o sitemap do próprio domínio)
    api/operacao.ts       /api/operacao: banco do app da redação (única rota de servidor)
    404.astro
public/
  redacao-345590b4/   ← app da redação (escondido, com senha; ver abaixo)
scripts/
  audit.mjs           ← auditoria do HTML final
  fetch-views.mjs     ← traz as visualizações do Google Analytics antes do build
  fila-do-app.mjs     ← baixa a fila do site do app da redação e marca o que foi publicado
  doc-snapshot.py     ← baixa o Google Docs de pauta
  sync-github.sh      ← publica (push para o GitHub)
  pull-github.sh      ← traz mudanças feitas direto no GitHub
```

### Fonte única de taxonomia

A lista de editorias **não existe escrita em lugar nenhum**. Ela é derivada dos
artigos em `content.ts` e exportada como `categories`. Header, home, rodapé, busca,
páginas de categoria e 404 importam essa mesma lista. É impossível haver divergência
de taxonomia entre as áreas do site.

### Componente único de card

`ArticleCard.astro` é o único card do projeto. Home, listagem, categoria, busca e
relacionados usam ele com variantes (`lead`, `default`, `compact`). Um ajuste visual
vale para o site inteiro.

### Busca sem divergência

Em `busca.astro`, todos os cards são renderizados no build. O filtro esconde os que
não batem, e o contador é **o resultado do mesmo laço** que esconde/mostra. Não
existe uma segunda contagem que possa divergir do que está na tela. Sem JavaScript,
a página mostra a edição inteira com o total correto.

### Capa automática, com override opcional

O hero é escolhido por `editorialScore()`, que combina:

- **centralidade**, in-degree no grafo de relacionados (para quantas matérias a
  edição aponta);
- **ênfase**, tamanho da editoria na edição;
- **atualidade**, quão recente é a matéria.

Tempo de leitura foi descartado de propósito: reportagem longa não é manchete.

Se a redação quiser fechar a capa manualmente, basta `cover: true` em **um** artigo
da base. O default continua automático; `automaticCover` continua exportado para
comparar a escolha do algoritmo com a escolha editorial.

---

## App da redação

Em `/redacao-345590b4`, fora do sitemap, com `noindex` e sem link visível: a única
entrada é o texto do copyright no rodapé. Pede a senha da equipe (`SENHA_EQUIPE`, na
Vercel). A equipe cola o artigo e sai com as 2 imagens do Instagram, a legenda e o
texto do site. Histórico, fila do Instagram e fila do site ficam no Upstash Redis
ligado ao projeto na Vercel (`KV_REST_API_*`), acessado só por `api/operacao.ts`.
Por causa dessa rota o projeto usa o adaptador `@astrojs/vercel`; todas as outras
páginas continuam pré-renderizadas.

## Google Analytics e cookies

Tag G-RZX972NG8R, só no deploy de produção. O público tem menores de idade, então a
tag só carrega depois que a pessoa clica em Aceitar no aviso de cookies
(`CookieConsent.astro`); sem escolha ou com Recusar, nenhum cookie do Google. O link
Cookies do rodapé reabre o aviso. Quem recusa não entra nas visualizações nem no
"Em Alta".

## Performance

- **0 KB de JavaScript de framework.** Nenhuma ilha foi necessária: busca, filtros,
  menu e barra de progresso são enhancement progressivo em TypeScript puro.
- Todas as imagens têm `width`/`height` e proporção declarada → sem layout shift.
- Apenas as 3 primeiras imagens de cada grade carregam com prioridade; o resto é
  `loading="lazy"`.
- Animação de entrada usa `animation-timeline: view()` (CSS puro), com fallback que
  simplesmente mostra o conteúdo.
- `prefers-reduced-motion` desliga todo o movimento.

## Acessibilidade

Lighthouse 100 em Acessibilidade, Boas Práticas e SEO (home, artigo e busca, mobile).

- Skip link para o conteúdo
- Foco visível em tudo (`:focus-visible`, nunca removido)
- Um `<h1>` por página, hierarquia de headings correta
- `aria-label` em todos os botões e links de ícone
- `aria-expanded` / `aria-controls` no menu, fechamento por `Esc`
- `role="status"` + `aria-live` no contador da busca
- `alt` descritivo em todas as imagens do site (mínimo validado no build)
- `lang="pt-BR"` e `<time datetime>` em todas as datas

---

## Pendências

1. **Corpo das matérias de id 1 a 77.** São as matérias com que a V2 nasceu: todas
   seguem a mesma estrutura de quatro movimentos, com 255-365 palavras, e são textos
   temporários. As de id 78 em diante são das equipes (Docs e app).

2. **Créditos de imagem.** Todas as imagens estão creditadas como `"Reprodução"`. O
   detentor real dos direitos precisa ser informado em `image.credit`.

O domínio (`site` em `astro.config.mjs`) vem da Vercel; com domínio próprio, defina
`SITE_URL`. Canonical, `og:url`, sitemap e robots.txt derivam dele.
