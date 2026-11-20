# BetStats

BetStats é uma aplicação web para acompanhamento de bancas, movimentações financeiras e apostas esportivas. O projeto está em preparação para publicação e deve ser tratado como software em desenvolvimento.

## Estado atual e limites

- A autenticação e o isolamento das rotas internas estão sob revisão nesta branch; não exponha a aplicação a terceiros até concluir os gates de segurança.
- Não há declaração de produção, disponibilidade pública ou implantação aberta neste repositório.
- A persistência usa SQLite local. Em ambientes de desenvolvimento e CI, use um banco vazio e efêmero; não versione arquivos de banco e não execute o seed observado neste histórico.
- Licenciamento, proveniência e avisos de terceiros são tratados em documentos próprios e ainda dependem de decisão de publicação.

## Requisitos

- Node.js 24 LTS ou compatível com o lockfile.
- npm.

## Desenvolvimento local

1. Copie `.env.example` para `.env.local` (ignorado pelo Git). Use um caminho SQLite vazio em `DATABASE_URL`, gere um `SESSION_SECRET` aleatório de pelo menos 32 bytes e mantenha `ALLOW_PUBLIC_REGISTRATION=false` salvo se o cadastro público for intencional.
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

## Retomada da coleta Telegram

Após perda de acesso do bot ou retirada da aprovação, uma fonte pode voltar a
coletar quando o worker confirma a mesma aprovação para bot, canal, dono e
referência de autorização. O worker confere o ID canônico do canal e a função
de administrador do bot e espera um lote vazio antes de reativar. O cadastro, o
marco original de ativação, o cursor e os recibos são preservados. A coleta
retoma com updates acima do cursor da retomada e posts criados a partir do
segundo seguinte, inclusive para edições. Pausas manuais, remoções e pausas
legadas sem evidência suficiente de terem sido feitas pelo worker permanecem
fora da coleta.

Na inicialização, falhas transitórias de `getMe` recebem até cinco tentativas
com espera exponencial de 1, 2, 4 e 8 segundos. O worker respeita `Retry-After`
de até 60 segundos e encerra se o Telegram pedir uma espera maior. A última
falha fica registrada como código de saúde, sem URL ou token. A coleta começa
somente após a confirmação do ID esperado. Um ID divergente encerra o worker.

## Verificações

```bash
npx tsc --noEmit --incremental false
npx eslint src
npm run build
```

O workflow de CI repete essas verificações com um SQLite efêmero e sem seed.
