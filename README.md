# BetStats

BetStats é uma aplicação web para acompanhamento de bancas, movimentações financeiras e apostas esportivas. O projeto está em preparação para publicação e deve ser tratado como software em desenvolvimento.

## Estado atual e limites

- As rotas em `src/app/api/internal` são interfaces internas sem autenticação ou isolamento de usuários. Não use dados reais, credenciais ou informações pessoais.
- Não há declaração de produção, disponibilidade pública ou implantação aberta neste repositório.
- A persistência usa SQLite local. Em ambientes de desenvolvimento e CI, use um banco vazio e efêmero; não versione arquivos de banco e não execute o seed observado neste histórico.
- Licenciamento, proveniência e avisos de terceiros são tratados em documentos próprios e ainda dependem de decisão de publicação.

## Requisitos

- Node.js 24 LTS ou compatível com o lockfile.
- npm.

## Desenvolvimento local

1. Crie uma configuração local de ambiente a partir de `.env.example`, mantendo-a fora do Git. Use um caminho SQLite local vazio em `DATABASE_URL`.
2. Instale exatamente as dependências do lockfile:

```bash
npm ci
```

3. Gere o cliente Prisma e crie apenas o esquema no banco local vazio:

```bash
npx prisma generate
npx prisma db push --skip-generate
```

4. Inicie o servidor limitado ao computador local:

```bash
npm run dev -- --hostname 127.0.0.1
```

Não execute `npm run prisma:seed` com dados reais ou observados.

## Verificações

```bash
npx tsc --noEmit --incremental false
npx eslint src
npm run build
```

O workflow de CI repete essas verificações com um SQLite efêmero e sem seed.
