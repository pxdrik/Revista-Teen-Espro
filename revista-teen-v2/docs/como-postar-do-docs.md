# Como postar no site os posts do Docs

Passo a passo para levar os posts novos do Google Docs de pauta para o site. Serve
para fazer à mão ou para pedir ao Claude ("pega os posts novos do Docs da Revista
Teen"), que segue este arquivo.

O texto é o das equipes: aqui só se organiza, nunca se escreve matéria do zero.

## Onde fica cada coisa

- Projeto: `01_Projetos/RevistaTeen/Atual`. Os caminhos abaixo são relativos a ele.
- Docs de pauta: "Documento de Auxílio Pesquisa/Redação"
  (`docs.google.com/document/d/11SbjxcK3P4mZzPWTos-_PmdKjQi0pcr1oP4Q2bkdmD8`). Precisa
  continuar com o link público de leitura, senão o script não consegue baixar.
- Base editorial: `src/data/edition-2026.ts` (array `articles`). É o único arquivo de
  conteúdo que muda, junto com as imagens.
- Imagens: `public/images/artigos/<slug>.jpg`.

## Passo a passo

1. Baixe o retrato do Docs: `python scripts/doc-snapshot.py`. Ele grava
   `.doc-snapshot/texto.txt` (um parágrafo por linha, com `[IMG images/x]` no ponto de
   cada imagem) e as imagens em `.doc-snapshot/images/`. A pasta não vai para o git.
   Os números das imagens mudam a cada download; use sempre os do retrato atual.
2. Leia `texto.txt` inteiro. As seções são os títulos `# ...`.
3. Encontre os posts. O formato normal é:
   - `[IMG ...]`: a imagem do post, logo antes;
   - `INSTAGRAM` + texto curto + `Fonte original: X`;
   - `SITE` + texto do site + `Fonte original: X`;
   - uma linha de autoria: `Autor: Nome`, `Autor Espro: Nome`, `AUTOR: NOME`,
     `feito por nome`, `Pesquisa e Design feito por Nome`, `Feito por: Nome`.

   Variações acontecem: rótulo na mesma linha do texto, título do post antes do
   `INSTAGRAM`, carrossel no formato `Foto / Título / Descrição / Fonte`. No
   carrossel, a `Descrição` é o texto do site e a capa é a lâmina com o título.
   Ignore os blocos de exemplo e o modelo do prompt.
4. **Já está no site?** Pegue os primeiros 50 caracteres do texto do SITE (ou da
   Descrição), com os espaços normalizados, e procure em `edition-2026.ts`. Achou,
   pule. Essa regra reconheceu todos os posts publicados até 30/09/2026.
5. **Incompleto?** Sem texto de site ou sem fonte: não publique e avise quem pediu.
6. Para cada post novo, crie a entrada no fim do array `articles`. Use os posts de id
   93 a 99 como modelo:
   - `id`: o maior id existente + 1, em sequência.
   - `slug`: kebab-case curto e único, sem acento.
   - `title` e `subtitle`: use o título do Docs se houver. Se não houver, escreva um
     no padrão da base (Title Case em português). O subtítulo traz um fato do texto.
   - `excerpt`: a primeira ou as duas primeiras frases do texto do INSTAGRAM.
   - `category`: pela seção do Docs onde o post está:
     - `# ENTRETERIMENTO E FAMOSOS` → `entretenimento-e-famosos`
     - `# MODA E BELEZA` → `moda-e-beleza`
     - `# EDUCAÇÃO E CULTURA` → `educacao-e-cultura`

     Se o assunto claramente não for daquela seção (o Setembro Azul estava em Moda),
     use a editoria certa e avise. O site tem só essas 3 editorias: não crie outra
     nem mexa em `categoryStyles`.
   - `tags`: de 2 a 4, tiradas do assunto.
   - `author`: o nome como está no Docs. `role`: "Pesquisador de <Editoria>" ou
     "Pesquisadora de <Editoria>", seguindo como a base já trata essa pessoa; na
     dúvida, "Pesquisa de <Editoria>". Sem autoria, use `{ name: "Redação Revista
     Teen", role: "Redação" }` e pergunte o nome a quem pediu.
   - `publishedAt`: a data de hoje (`AAAA-MM-DD`). Uma data futura também funciona:
     o build esconde a matéria até esse dia, mas ela só aparece no primeiro deploy
     depois da data.
   - `readingTime`: palavras do corpo / 200, arredondado para cima, mínimo 1.
   - `image`: converta a imagem do post para JPG, com no máximo 1200 px no lado
     maior e qualidade 82, em `public/images/artigos/<slug>.jpg` (Pillow). **Abra a
     imagem e olhe** antes de escrever o `alt`: mínimo de 10 caracteres, descrevendo
     a imagem, sem repetir o título. Peça gráfica com texto (carrossel, print) leva
     `fit: "contain"`. `credit: "Reprodução"`.
   - `body`: exatamente 4 parágrafos. Os 3 primeiros são o texto do SITE dividido
     em 3 blocos naturais: se ele já tem 3 parágrafos, mantenha; se tem 1 ou 2,
     divida por frases. O 4º é `A reportagem tem como fonte original <o/a> <Fonte>.`
     Cada parágrafo precisa ter pelo menos 40 caracteres.
   - Sem `sources`: o Docs não traz o link da matéria original.
7. Regras de texto:
   - Mantenha o texto das equipes. Corrija só erro evidente de digitação ou de nome
     próprio (ex.: "Eventin" → "Eventim").
   - **Nunca invente fato, número, fala ou data.**
   - Sem travessão (— ou –) no texto. Sem emoji.
8. `npm run build` e `node scripts/audit.mjs`. Se falhar, corrija a entrada nova.
   Nunca altere matéria antiga só para o build passar.
9. Confira no navegador (`npm run preview`, em `localhost:4321`): o card na editoria
   e a página da matéria, principalmente se a imagem saiu bem enquadrada.
10. Commit de `src/data/edition-2026.ts` e das imagens novas, com mensagem do tipo
    `Adiciona N posts do Docs (ids X-Y)`, e envie com
    `bash scripts/sync-github.sh "mensagem"`. O push dispara o deploy na Vercel, que
    também atualiza as visualizações do Google Analytics.

## Ao terminar, informe

- Os posts publicados: título, editoria e autor.
- Os pulados e o motivo (incompleto, sem autor, editoria trocada).
- Toda decisão tomada no lugar da equipe (título escrito, fonte ambígua, correção).
