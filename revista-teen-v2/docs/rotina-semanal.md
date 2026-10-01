# Rotina semanal: posts do Docs para o site

Roteiro seguido toda quinta à noite pela rotina agendada (Claude na nuvem), depois
da produção das equipes. Também serve para rodar à mão.

A rotina **lê** o Google Docs de pauta, **agenda** os posts novos na base do site e
**publica** o commit. Ela não escreve matéria do zero: o texto é o das equipes.

## Onde fica cada coisa

- Projeto: a pasta `revista-teen-v2/` do repositório `pxdrik/Revista-Teen-Espro`.
  Todos os caminhos abaixo são relativos a ela.
- Base editorial: `src/data/edition-2026.ts` (array `articles`). É o único arquivo de
  conteúdo que muda, junto com as imagens.
- Imagens: `public/images/artigos/<slug>.jpg`.
- Retrato do Docs: `python3 scripts/doc-snapshot.py` grava `.doc-snapshot/texto.txt`
  (um parágrafo por linha, `[IMG images/x]` onde há imagem) e `.doc-snapshot/images/`.

## Passo a passo

1. `npm ci` e `python3 scripts/doc-snapshot.py`.
2. Leia `.doc-snapshot/texto.txt` inteiro. As seções são os títulos `# ...`.
3. Encontre os posts. O formato normal é:
   - `[IMG ...]` (a imagem do post, logo antes);
   - `INSTAGRAM` + texto curto + `Fonte original: X`;
   - `SITE` + texto do site + `Fonte original: X`;
   - uma linha de autoria: `Autor: Nome`, `Autor Espro: Nome`, `AUTOR: NOME`,
     `feito por nome`, `Pesquisa e Design feito por Nome`, `Feito por: Nome`.

   Variações acontecem (rótulo na mesma linha do texto, título do post antes do
   `INSTAGRAM`, carrossel no formato `Foto / Título / Descrição / Fonte`). Use bom
   senso. No carrossel, a `Descrição` é o texto do site e a imagem de capa é a
   lâmina com o título. Ignore os blocos de exemplo e o modelo do prompt.
4. **Já está no site?** Pegue os primeiros 50 caracteres do texto do SITE (ou da
   Descrição), com os espaços normalizados, e procure em `edition-2026.ts`. Achou,
   pule. Esta regra reconhece todos os posts publicados até hoje.
5. **Incompleto?** Sem texto de site ou sem fonte: não publique e liste no relatório.
6. Para cada post novo, monte a entrada no fim do array `articles`, seguindo os
   posts de id 93 a 99 como modelo:
   - `id`: o maior id existente + 1, em sequência.
   - `slug`: kebab-case curto e único, sem acento.
   - `title` e `subtitle`: use o título do Docs se houver; se não, escreva um no
     padrão da base (Title Case em português). Subtítulo com um fato do texto.
   - `excerpt`: a primeira ou as duas primeiras frases do texto do INSTAGRAM.
   - `category`: pela seção onde o post está no Docs:
     - `# ENTRETERIMENTO E FAMOSOS` → `entretenimento-e-famosos`
     - `# MODA E BELEZA` → `moda-e-beleza`
     - `# EDUCAÇÃO E CULTURA` → `educacao-e-cultura`

     Se o assunto claramente não for daquela seção, use a editoria certa e avise no
     relatório. Nunca crie editoria nova nem mexa em `categoryStyles`.
   - `tags`: de 2 a 4, tiradas do assunto.
   - `author`: o nome como está no Docs. `role`: "Pesquisador de <Editoria>" ou
     "Pesquisadora de <Editoria>", seguindo como a base já trata essa pessoa; na
     dúvida, "Pesquisa de <Editoria>". Sem autoria: `{ name: "Redação Revista Teen",
     role: "Redação" }`, e avise no relatório.
   - `publishedAt`: veja "Agenda" abaixo.
   - `readingTime`: palavras do corpo / 200, arredondado para cima, mínimo 1.
   - `image`: converta a imagem do post para JPG, no máximo 1200 px no lado maior,
     qualidade 82, em `public/images/artigos/<slug>.jpg` (Pillow; se não houver,
     `pip install pillow`). **Abra a imagem e olhe** antes de escrever o `alt`
     (mínimo 10 caracteres, descreve a imagem, não repete o título). Peça gráfica com
     texto, como carrossel ou print: `fit: "contain"`. `credit: "Reprodução"`.
   - `body`: exatamente 4 parágrafos. Os 3 primeiros são o texto do SITE, dividido
     em 3 blocos naturais (se o texto já tem 3 parágrafos, mantenha; se tem 1 ou 2,
     divida por frases). O 4º é `A reportagem tem como fonte original <o/a> <Fonte>.`
     Cada parágrafo precisa ter 40 caracteres ou mais.
   - Sem `sources`: o Docs não traz o link da matéria original.
7. Regras de texto:
   - Mantenha o texto das equipes. Corrija só erro evidente de digitação ou nome
     próprio (ex.: "Eventin" → "Eventim").
   - **Nunca invente fato, número, fala ou data.**
   - Sem travessão (— ou –) no texto. Sem emoji.
8. `npm run build` e `node scripts/audit.mjs`. Se falhar, corrija a entrada que você
   criou. Nunca altere matéria antiga para fazer o build passar.
9. Commit só de `src/data/edition-2026.ts` e das imagens novas, com mensagem
   `Agenda N posts do Docs (ids X-Y)` e a lista dos posts com a data de cada um no
   corpo. Push na `main`. Se o push for recusado, crie a branch
   `rotina/posts-AAAA-MM-DD`, faça push nela e avise no relatório.
10. Nada novo: não commite. O relatório diz só "nada novo no Docs".

## Agenda

Os posts entram com data futura e o site só mostra cada um no dia dele (o build
filtra por `publishedAt`, no fuso de São Paulo). Um rebuild diário vai liberando a
fila. Os dias de cada editoria espelham a escala do Instagram:

| Editoria | Dias |
| --- | --- |
| Entretenimento e Famosos | segunda e quarta |
| Moda e Beleza | terça e sexta |
| Educação e Cultura | sábado e domingo |

Para cada editoria, na ordem em que os posts aparecem no Docs, cada post novo
recebe o **próximo dia da editoria depois de hoje e depois do último `publishedAt`
que a editoria já tem na base**. Assim, se uma equipe mandar mais posts que dias,
o excedente entra nas semanas seguintes, sem empurrar ninguém.

Quinta não tem post: é o dia da produção.

## Relatório final

- Posts agendados: data, editoria, título, autor.
- Posts pulados e por quê (incompleto, sem autor, editoria trocada).
- Resultado do build e da auditoria, e o hash do commit.
