# Revista Teen V2

Revista digital escolar (Espro) em Astro, publicada na Vercel em
revista-teen-espro.vercel.app. Detalhes de arquitetura no README.

- **Postar os posts novos do Docs:** siga `docs/como-postar-do-docs.md`.
- **Publicar:** `bash scripts/sync-github.sh "mensagem"`. O script valida, copia o
  projeto para a pasta `revista-teen-v2/` do repositório `pxdrik/Revista-Teen-Espro` e
  faz o push. Este git local não tem remote. Se o script avisar que o GitHub mudou,
  rode `bash scripts/pull-github.sh` antes.
- **Editorias:** só as 3 do Docs (Entretenimento e Famosos, Moda e Beleza, Educação e
  Cultura).
- **Google Analytics:** propriedade 536740001. `scripts/fetch-views.mjs` roda antes de
  cada build e traz as visualizações. A chave da conta de serviço fica fora do
  projeto, em `08_Seguranca`; o `.env` aponta para ela e nunca vai para o git.
- Texto visível no site: sem travessão e sem emoji.
