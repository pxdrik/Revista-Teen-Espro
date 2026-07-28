# Revista Teen, V2

Revista digital para jovens de 14 a 24 anos. Reconstruída do zero em Astro, mantendo
a identidade visual da V1 (paleta, tipografia, cards, animações, hero).

## Como rodar

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # gera dist/ (99 páginas estáticas)
npm run preview    # serve o build
npm run check      # typecheck (Astro + TypeScript)
npm run audit:content   # auditoria do HTML construído (rodar após build)
```

---

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
  lib/
    schema.ts         ← contrato Zod da base
    content.ts        ← valida, deriva taxonomia, calcula curadoria
  components/         ← Header, Footer, ArticleCard, CategoryBadge, Breadcrumb
  layouts/
    BaseLayout.astro  ← <head>, SEO, JSON-LD
  pages/
    index.astro           /
    artigos/index.astro   /artigos
    artigos/[slug].astro  /artigos/<slug>       (77 páginas)
    categoria/[slug].astro /categoria/<slug>    (17 páginas)
    busca.astro           /busca
    eventos.astro         /eventos
    404.astro
scripts/
  audit.mjs           ← auditoria do HTML final
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

Em `busca.astro`, os 77 cards são renderizados no servidor. O filtro esconde os que
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
- `alt` descritivo em todas as 557 imagens do site
- `lang="pt-BR"` e `<time datetime>` em todas as datas

---

## Pendências antes de publicar

Dois campos são provisórios **por decisão de escopo** e precisam de passada da redação:

1. **Corpo das matérias.** Todos os 77 textos seguem a mesma estrutura de quatro
   movimentos (introdução, contextualização, desenvolvimento, conclusão), com
   255-365 palavras. São textos temporários, substitua `body` de cada artigo.

2. **Créditos de imagem.** Todas as imagens vieram da pauta visual em PDF e estão
   creditadas como `"Reprodução"`. O detentor real dos direitos precisa ser
   informado em `image.credit` antes da publicação.

Também troque `site` em `astro.config.mjs` pelo domínio real, canonical, `og:url`
e o sitemap derivam dele.
