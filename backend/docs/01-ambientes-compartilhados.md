# Ambientes compartilhados (contas conjuntas)

**Data:** 2026-10-10
**Plano:** [01-BACKEND-ambientes-compartilhados](../../docs/plans/01-BACKEND-ambientes-compartilhados.md)

## O que foi feito

- **Prisma (`prisma/schema.prisma`)**: novos models `Environment`, `EnvironmentMember` (com
  `userId` nullable para membro real vs. `displayName` para participante sem login, e
  `removedAt` para soft delete) e `EnvironmentInvite` (`status`: pending/accepted/declined/
  expired). `Category` troca `userId` por `environmentId` (`@@unique([environmentId, title])`).
  `Transaction` troca `userId` por `environmentId` + `createdBy` (renomeado do antigo `userId`) +
  `memberId` (FK → `EnvironmentMember`, `onDelete: Restrict`). `User` ganha
  `defaultEnvironmentId` (nullable, `onDelete: SetNull`).
- **Migration de dados** (`prisma/migrations/20261010120000_ambientes_compartilhados/migration.sql`,
  escrita manualmente): cria as tabelas novas, adiciona as colunas novas como nullable, faz o
  backfill (1 `Environment` pessoal + 1 `EnvironmentMember(role: admin)` por `User` existente,
  realocando toda `Category`/`Transaction` existente para esse ambiente), só então aplica
  `NOT NULL`, remove `Category.userId` (sem substituto) e recria índices/FKs. Aplicada com
  `prisma migrate deploy` contra o Postgres (Neon) apontado por `DATABASE_URL` — ver "Por que esse
  caminho foi escolhido" sobre o motivo de não usar `prisma migrate dev` aqui.
- **Autorização** (`src/utils/environment-access.ts`): `assertEnvironmentAccess` e
  `assertEnvironmentAdmin`, substituindo a checagem manual `registro.userId !== userId` em
  `TransactionService`/`CategoryService`.
- **`src/services/environment.service.ts`** (novo): convite (`inviteMember`, com e-mail via
  `EmailService.sendEnvironmentInviteEmail`, novo método seguindo o padrão de
  `sendForgotPasswordEmail`), aceite/recusa (`acceptEnvironmentInvite`/
  `declineEnvironmentInvite`, com upsert no aceite e checagem lazy de expiração),
  `cancelEnvironmentInvite`, criação/saída/remoção de membros e participantes
  (`createParticipant`/`removeParticipant`/`removeMember`/`leaveEnvironment`, todos soft delete),
  `promoteToAdmin`, `deleteEnvironment` (hard delete atômico via `$transaction`),
  `renameEnvironment`, `setDefaultEnvironment` e as listagens (`listMyEnvironments`,
  `listMyPendingInvites`, `listEnvironmentInvites`, `listActiveMembers`).
- **Models/DTOs**: `environment.model.ts`, `environment-member.model.ts`,
  `environment-invite.model.ts`, `environment.input.ts` (`CreateEnvironmentInput`,
  `InviteMemberInput`, `CreateParticipantInput`). `transaction.input.ts`/`category.input.ts`
  ganham `environmentId`/`memberId` obrigatórios. `TransactionModel` ganha os campos
  `createdBy: UserModel!` e `member: EnvironmentMemberModel!`, resolvidos via `FieldResolver` em
  `TransactionResolver` (mesmo padrão já usado para `category`).
- **`src/resolvers/environment.resolver.ts`** (novo): `EnvironmentResolver` (queries/mutations do
  ambiente + `FieldResolver` de `members`), `EnvironmentMemberResolver` (`FieldResolver` de
  `user`) e `EnvironmentInviteResolver` (`FieldResolver` de `environment`/`invitedBy`) — três
  classes pequenas no mesmo arquivo porque cada uma delas é o alvo de `@Resolver(() => X)` para um
  tipo GraphQL diferente do mesmo agregado, todas delegando para o único `EnvironmentService`.
  Registradas em `src/index.ts`.
- **`TransactionService`/`CategoryService`/seus resolvers**: `environmentId` substitui `userId`
  como escopo; `listCategories`/`listTransactions` passam a receber `environmentId` como
  argumento; `getCategoryById`/`getTransactionById`/`update*`/`delete*` continuam recebendo só
  `id` e derivam o `environmentId` do próprio registro buscado no banco (nunca de um argumento
  solto do client — mesmo princípio do `cancelEnvironmentInvite`). `TransactionService` valida que
  `memberId` pertence ao mesmo `environmentId` da transação.
- **`AuthService.register`**: agora cria, na mesma `$transaction`, o `User` + seu `Environment`
  pessoal (`isPersonal: true`) + `EnvironmentMember(role: admin)`.

## Por que foi feito

Hoje cada usuário só vê seus próprios dados financeiros. A tarefa pede suporte a "ambientes"
compartilhados (ex.: finanças de um casal ou família), onde várias pessoas com login — e também
"participantes" sem login, usados só para atribuição de transações — compartilham o mesmo espaço
de categorias/transações, com papéis de Admin/usuário e um histórico que sobrevive à saída de
qualquer pessoa do ambiente.

## Por que esse caminho foi escolhido

- **Soft delete em `EnvironmentMember`** (`removedAt`) em vez de `delete` físico na saída/remoção/
  remoção de participante: `Transaction.memberId` referencia essa tabela; `onDelete: Cascade`
  apagaria histórico financeiro real e `onDelete: Restrict` travaria qualquer saída de quem já
  tem transação. Soft delete evita os dois problemas e é o padrão único usado nos três fluxos
  (saída, remoção de membro, remoção de participante).
- **`Transaction.memberId` com `onDelete: Restrict`** (nunca `Cascade`): como saída/remoção nunca
  apaga a linha de verdade, essa FK não deveria nunca ver uma deleção real fora do único fluxo
  controlado que apaga `EnvironmentMember` de verdade — `deleteEnvironment`. Por isso
  `EnvironmentService.deleteEnvironment` apaga `Transaction` **antes** de `EnvironmentMember`
  dentro do mesmo `$transaction` (mesmo padrão já usado em `CategoryService.deleteCategory`),
  garantindo que o `Restrict` nunca seja violado nesse fluxo.
- **Aceite de convite como upsert, não `create`**: `@@unique([environmentId, userId])` vale sobre
  a tabela inteira (ativos e soft-deletados). Reaceitar um convite para um ambiente de onde a
  pessoa já saiu reaproveita a linha antiga (`removedAt: null`, `role`/`joinedAt` atualizados) em
  vez de tentar criar uma nova linha, que violaria a constraint. Confirmado por teste manual
  (ver "Validação" abaixo): sair, ser reconvidado e reaceitar não falha e não duplica a linha.
- **`EnvironmentInvite` com `onDelete: Cascade` em `environmentId`**: convite é só uma intenção,
  nada referencia `EnvironmentInvite.id` por FK em outra tabela — diferente de
  `EnvironmentMember`, cascade aqui é seguro. Isso também permite que `deleteEnvironment` não
  precise apagar convites manualmente: o `Environment.delete` final do `$transaction` já cascateia
  isso (e também `Category`, mas optei por apagar `Category` explicitamente antes, no mesmo estilo
  de `deleteCategory`, para manter a operação legível e explícita em vez de depender implicitamente
  do cascade do banco).
- **`User.defaultEnvironmentId` com `onDelete: SetNull`**: sem isso, excluir um ambiente que seja
  o padrão de alguém falharia por violação de FK. Com `SetNull`, o campo volta a `null` e a regra
  de "cai no ambiente pessoal se nulo ou inacessível" (a ser aplicada no login, no plano de
  frontend) resolve o resto.
- **Migration escrita manualmente em vez de gerada por `prisma migrate dev`**: o script `npm run
  migrate` do projeto roda `prisma migrate dev`, que é interativo e também precisa de um banco
  "shadow" para diffar — nesta tarefa, rodando num agente não-interativo, `migrate dev` recusa
  executar ("Prisma Migrate has detected that the environment is non-interactive"). Gerei o diff
  de DDL com `prisma migrate diff --from-url ... --to-schema-datamodel schema.prisma --script`
  (não-interativo) para conferir exatamente quais `CREATE`/`ALTER`/`DROP` o Prisma geraria, e
  depois escrevi `migration.sql` à mão nessa base, inserindo o backfill de dados no meio (Prisma Migrate
  não gera DML automaticamente) e reordenando para que as colunas só fiquem `NOT NULL` depois do
  backfill. Aplicada com `prisma migrate deploy` (não-interativo, o mesmo comando que o script
  `build` do projeto já usa em produção). Testada antes com uma contagem de linhas
  (`user.count()`/`category.count()`/`transaction.count()`) no banco real de desenvolvimento
  (Postgres via Neon, apontado por `DATABASE_URL`) — 2 usuários, 0 categorias, 0 transações — e
  depois confirmando que cada um dos 2 usuários ganhou exatamente 1 `Environment` pessoal +
  1 `EnvironmentMember(role: admin)` após a migration.
- **`createdBy`/`member` como campos resolvidos (não escalares) em `TransactionModel`**: o plano
  pede `createdBy: UserModel!`/`member: EnvironmentMemberModel!` no schema GraphQL. Como a coluna
  no banco já se chama `createdBy`, o campo bruto (string) e o campo GraphQL resolvido (objeto)
  disputariam o mesmo nome na classe do model; resolvido com `@Field(() => UserModel, { name:
  "createdBy" })` numa propriedade com outro nome (`createdByUser`) e mantendo o valor bruto numa
  propriedade `createdBy` sem decorator (só para tipagem interna do resolver) — sem alterar o
  nome do campo GraphQL exposto. `memberId`/`member` não têm esse conflito (nomes diferentes),
  seguindo exatamente o padrão já existente de `categoryId`/`category`.
- **Três classes de resolver em um arquivo (`environment.resolver.ts`)**: TypeGraphQL liga
  `@FieldResolver` ao tipo GraphQL declarado em `@Resolver(() => X)` da classe — como o agregado
  tem três tipos de saída (`EnvironmentModel`, `EnvironmentMemberModel`, `EnvironmentInviteModel`),
  cada um com seus próprios campos resolvidos, usar uma classe por tipo (todas no mesmo arquivo,
  todas chamando o único `EnvironmentService`) é a forma correta de registrar isso no
  `buildSchema`, mesmo mantendo "um resolver e um service por agregado" em espírito.
- **`createdBy` não é mais sobrescrito em `updateTransaction`**: o código original reatribuía
  `userId` ao usuário que fizesse a edição a cada `update`, o que contradiz a semântica de
  auditoria que `createdBy` passa a ter explicitamente ("quem efetivamente lançou"). Corrigido
  como código do escoteiro já que o arquivo estava aberto para esta mudança — `createdBy` agora é
  gravado só na criação e nunca mais tocado.
- **`environmentId` nunca confiado a partir do input em updates**: `updateCategory`/
  `updateTransaction` ignoram qualquer `environmentId` que venha em `data` e usam o
  `environmentId` do registro já persistido (buscado por `id`) para a checagem de acesso — mesmo
  princípio de `cancelEnvironmentInvite` already citado no plano e em `backend/CLAUDE.md`.

## Validação

- `npx prisma migrate deploy` aplicado com sucesso contra o Postgres de desenvolvimento (Neon);
  `npx prisma migrate status` confirma "Database schema is up to date!".
- `npx prisma generate` sem erros.
- `npx tsc --noEmit --skipLibCheck` sem erros (os únicos erros de `tsc --noEmit` sem
  `--skipLibCheck` são pré-existentes, de declarações de tipos de dependências opcionais não
  instaladas — `react` usado por `resend`, `class-validator` usado por `type-graphql` — não
  relacionados a este código).
- `buildSchema` (via boot real do servidor com `tsx src/index.ts`) gera `schema.graphql` sem
  erros, com o schema GraphQL batendo com o desenho do plano (`EnvironmentModel`,
  `EnvironmentMemberModel`, `EnvironmentInviteModel`, mutations/queries novas,
  `TransactionModel.createdBy`/`member` como `UserModel!`/`EnvironmentMemberModel!`).
- Smoke test manual (script descartável, executado e removido) cobrindo os riscos mais
  sensíveis do plano, todos passando: criar ambiente → convidar → aceitar (membro ativo, role
  aplicado) → criar participante + transação atribuída a ele → `memberId` de outro ambiente é
  rejeitado na criação da transação → sair do ambiente faz soft delete (linha preservada,
  `removedAt` preenchido) → reconvite + reaceite reaproveita a MESMA linha (upsert, sem violar
  `@@unique([environmentId, userId])`) → remover participante é soft delete e a transação dele
  continua existindo → `removeMember` é soft delete → `deleteEnvironment` apaga de verdade
  (ambiente, categorias, membros e transações, incluindo a do participante já soft-deletado), sem
  violar a FK `Restrict` de `Transaction.memberId`. Banco de desenvolvimento confirmado limpo
  (de volta aos 2 usuários/ambientes pessoais originais) depois do teste.

## Atualização pós-QA (2026-10-10)

Uma rodada de QA independente, feita após este registro, rodou o fluxo completo contra o servidor
GraphQL real (não só contra o Prisma direto) e encontrou um bug que o smoke test original não
pegou: ao pedir o campo `createdBy` de uma transação recém-criada (`createTransaction { createdBy
{ id name } }`), a API retornava erro `Cannot return null for non-nullable field
TransactionModel.createdBy`.

**Causa**: o `@FieldResolver` responsável por resolver esse campo estava com o método nomeado
`createdBy` (igual ao nome exposto no GraphQL via `{ name: "createdBy" }`), mas a propriedade do
model que ele deveria sobrescrever se chama `createdByUser`. Nesse projeto/versão do TypeGraphQL, a
ligação entre um `@FieldResolver` e o campo auto-gerado a partir de `@Field({ name: ... })` numa
propriedade de outro nome depende do **nome do método** coincidir com o **nome da propriedade**, não
com o nome exposto no GraphQL — diferente do que o padrão `category`/`categoryId` sugeria (ali
nome de propriedade e nome GraphQL já coincidem, então nunca expôs esse problema). Sem essa
coincidência, o resolver auto-gerado pela propriedade (que lê `root.createdByUser`, sempre
`undefined` num objeto `Transaction` puro do Prisma sem `include`) venceu silenciosamente, sem
erro no `buildSchema` nem no `tsc`.

**Correção**: renomeado o método em `TransactionResolver` de `createdBy` para `createdByUser`
(mantendo o decorator `@FieldResolver(() => UserModel, { name: "createdBy" })`, que já controlava
corretamente o nome exposto). Nenhuma outra mudança necessária.

Isso reforça por que a seção "Validação" abaixo, embora tenha coberto corretamente toda a regra de
negócio via Prisma, não bastava sozinha — faltava exercitar a resposta GraphQL real pedindo os
campos resolvidos (`createdBy { ... }`, `member { ... }`) como um client de fato faria. Ver o
relatório completo de QA: [01-QA-BACK-ambientes-compartilhados](../../docs/qa/01-QA-BACK-ambientes-compartilhados.md).

## Pendências / próximos passos

- Frontend (plano irmão [01-FRONTEND-ambientes-compartilhados](../../docs/plans/01-FRONTEND-ambientes-compartilhados.md)) ainda não implementado — fora do escopo desta tarefa.
- A regra "login cai no ambiente pessoal se `defaultEnvironmentId` for nulo ou inacessível" é uma
  decisão de qual ambiente o frontend/sessão usa por padrão; o backend só garante o dado
  (`User.defaultEnvironmentId` com `SetNull`) e a mutation `setDefaultEnvironment` — a resolução
  efetiva "qual ambiente carregar no login" cabe ao consumidor (frontend) e não foi implementada
  como uma query própria nesta etapa, por não constar explicitamente na lista de queries/mutations
  do plano.
