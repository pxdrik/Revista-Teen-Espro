# Revista Teen

Revista digital de entretenimento para adolescentes. Cobertura de música, moda, esportes e eventos em São Paulo.

## Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Radix UI, tRPC, Wouter
- **Backend:** Node.js, Express, tRPC
- **Banco de Dados:** MySQL (via Drizzle ORM)
- **Build:** Vite, esbuild
- **Package Manager:** pnpm

## Estrutura do Projeto

```
revista-teen/
├── client/
│   └── src/
│       ├── App.tsx               # Roteamento principal
│       ├── index.css             # Estilos globais + variáveis CSS
│       └── pages/
│           ├── Home.tsx          # Página inicial
│           ├── Articles.tsx      # Listagem de artigos por categoria
│           ├── ArticleDetail.tsx # Detalhe do artigo + comentários
│           ├── Events.tsx        # Eventos em SP com filtros
│           └── AdminDashboard.tsx# Painel admin (requer role=admin)
├── server/
│   ├── routers.ts               # API tRPC (articles, events, comments, newsletter)
│   ├── db.ts                    # Funções de acesso ao banco de dados
│   └── routers.test.ts          # Testes dos roteadores
└── drizzle/
    └── schema.ts                # Schema do banco de dados (MySQL)
```

## Funcionalidades

- **Artigos** por categorias: Esportes, Música, Moda, Entretenimento, Assuntos Gerais
- **Eventos** em São Paulo com filtros por bairro e preço
- **Comentários** em artigos (requer autenticação)
- **Newsletter** via email
- **Admin Dashboard** para gerenciar artigos e eventos
- **Compartilhamento** de artigos via Twitter, WhatsApp e Instagram

## Instalação

```bash
pnpm install
```

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```env
DATABASE_URL=mysql://user:password@host:3306/revista_teen
OWNER_OPEN_ID=seu_open_id
```

## Comandos

```bash
# Desenvolvimento
pnpm dev

# Build de produção
pnpm build

# Iniciar em produção
pnpm start

# Migrar banco de dados
pnpm db:push

# Rodar testes
pnpm test

# Type check
pnpm check
```
