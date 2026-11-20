# Worker Telegram do BetStats

O cadastro por @username cria um rascunho. O operador aprova uma tupla exata
`botId`, `chatId`, `ownerUserId` e `authorizationRef`. O worker confere o ID
canônico do canal, o username atual, o dono do rascunho e a permissão de
administrador do próprio bot. A permissão do bot não autoriza o dono do
rascunho. O mesmo canal tem um único dono no BetStats.

O worker é um processo Node separado do Next.js, tanto em desenvolvimento
quanto em produção. Ele usa o Prisma Client gerado para o schema da aplicação.
Compile e execute separadamente, a partir da raiz do projeto:

```powershell
node node_modules/typescript/bin/tsc -p scripts/tsconfig.telegram.json
node --env-file=.env.telegram.local build/telegram-worker/scripts/telegram-worker.js
```

O processo lê `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USER_ID` e
`TELEGRAM_SOURCE_APPROVALS` do ambiente. O token fica apenas no ambiente do
worker, sem banco, payload de status ou logs. Sem token o processo sai com a
integração desativada. O ID público esperado do bot deve corresponder ao ID
de `getMe`. O ambiente do Next recebe apenas o ID público para consultar o
estado do worker. A lista de aprovações é um JSON privado provisionado pelo
operador no ambiente do worker e lido no início de cada processo. Em cada
entrada, IDs são strings decimais e `authorizationRef` é uma referência opaca
ao registro de aprovação. Alterar a lista exige reiniciar o worker. Uma
aprovação removida ou perda da função de administrador pausa a fonte. A
ativação usa rascunhos de canais com username público. Uma fonte pausada
automaticamente por perda de acesso ou revogação pode ser retomada quando a
mesma tupla de aprovação (bot, canal, dono e referência), o ID canônico do
canal e a função de administrador do bot forem confirmados. A retomada aguarda
lote vazio, preserva o vínculo e os dados existentes e grava um novo corte por
cursor/data para não importar mensagens anteriores. Pausas manuais, fontes
removidas e pausas legadas ambíguas continuam inativas.

O primeiro ciclo drena a fila global antes de habilitar fontes. O worker
ativa novos rascunhos após um lote vazio, sem descartar mensagens das fontes
já ativas. Na ativação, guarda o último update confirmado e começa no
próximo segundo inteiro, para excluir mensagens do segundo de transição.
Ingestão exige update posterior ao marco e usa a data de criação original,
inclusive em edições. O worker verifica a aprovação e o acesso também durante
a coleta. Lease com token crescente impede mutações por um worker antigo.
Ingestão DATA, recibo único e cursor são atômicos. Cada update coletado tem
um CollectionRun. Mensagens são deduplicadas e versionadas pelo DATA.
Se DATA rejeitar o conteúdo por validação, data original conflitante ou
envelope inconsistente de reentrega, o worker grava recibo `quarantined_payload`,
registra a execução com `data_payload_quarantined` e o motivo de código fechado,
e avança o cursor na mesma transação. A mensagem rejeitada e sua mídia não são
persistidas. A API do dono exibe o código enquanto for a execução mais recente
da fonte. Se o banco falhar, a transação reverte e o worker tenta novamente
com intervalo crescente a partir do mesmo cursor durável.
A mídia registra referências `file_unique_id` opacas. Sem registros
delimitados, DATA marca a mensagem para revisão.

`GET /api/internal/sources` e `GET /api/internal/sources/:id` acrescentam
`connection` ao registro do dono autenticado. A consulta individual retorna
404 para fonte alheia, removida ou desconhecida. A listagem inclui tamb?m
`collector` com `status` (`disabled`, `running`, `degraded` ou `stopped`),
`lastSuccessAt` e `lastErrorCode`. O estado por fonte inclui `status`
(`disabled`, `awaiting_approval`, `awaiting_bot_access`, `paused`, `offline`, `degraded` ou
`connected`), `errorCode`, `activatedAt`, `lastCollectedAt` e
`lastPollSuccessAt`. Códigos podem ser nulos e datas são ISO ou nulas.
`connected` indica que a fonte está ativa e o worker tem lease válido.
O estado pode ficar defasado até a próxima verificação ou expiração do lease.

Use um bot dedicado a este worker. A Bot API retém updates por até 24 horas,
retorna até 100 por lote e exige que o modo webhook esteja desativado para
polling. O worker registra interrupções longas quando detectáveis e perde
cobertura se a fila expirar. Após seis dias sem um update confirmado, ele
para com `sequence_uncertain` antes de enviar um offset antigo, pois o
Telegram pode iniciar nova sequência após uma semana sem updates. A
recuperação desse caso requer nova linha de base com revisão operacional.
A Bot API de canais não entrega histórico nem eventos gerais de exclusão.
[Referência oficial da Bot API](https://core.telegram.org/bots/api). Falhas
transitórias na verificação inicial `getMe` são registradas com código
sanitizado e recebem até cinco tentativas com espera progressiva; uma
identidade diferente da configurada encerra o worker.

Testes offline: `node --test src/lib/telegram/bot-polling.test.cjs`.
A integração SQLite usa `AUTH_TEST_CLIENT` e `AUTH_TEST_DATABASE_URL` apontando
para cliente e banco descartáveis gerados a partir do schema atual. O teste
exige caminho `mission6-tests-<hex>/auth-test.sqlite` e usa somente fixtures.
