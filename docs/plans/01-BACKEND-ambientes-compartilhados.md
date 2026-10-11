# 01 - BACKEND - Ambientes compartilhados (contas conjuntas)

**Status:** Concluído — [registro de decisão](../../backend/docs/01-ambientes-compartilhados.md)
**Data:** 2026-10-10
**Plano irmão:** [01-FRONTEND-ambientes-compartilhados](./01-FRONTEND-ambientes-compartilhados.md)

## Objetivo

Permitir que múltiplos usuários compartilhem o mesmo espaço financeiro ("ambiente"), com membros
reais (com login) ou participantes sem login usados apenas para atribuição de transações. Toda
transação deve registrar tanto quem a lançou (auditoria) quanto a quem ela é atribuída (membro ou
participante do ambiente).

## Abordagem proposta

### Novas entidades (Prisma)

- `Environment`: `id, name, isPersonal (boolean, default false), createdAt, updatedAt`.
- `EnvironmentMember`: `id, environmentId (FK → Environment, cascade), userId (FK → User,
  nullable), role (enum: admin | user, nullable quando é participante), displayName (string, usado
  só quando userId é nulo), joinedAt, removedAt (DateTime, nullable)`.
  - `userId` preenchido = membro real (pode logar, `role` aplica). `userId` nulo = participante
    (só existe para atribuição, sem permissão nenhuma).
  - Precisa garantir que exatamente um entre `userId`/`displayName` esteja preenchido — avaliar
    `@@check` (se suportado pela versão de Prisma/Postgres em uso) ou validação centralizada no
    `EnvironmentService` caso o check declarativo não seja viável.
  - **`removedAt` é obrigatório por integridade, não é cosmético**: `Transaction.memberId`
    referencia `EnvironmentMember.id`. Se sair/ser removido apagasse a linha, ou a FK precisaria de
    `onDelete: Cascade` (apagando o histórico de transações dessa pessoa — contradiz a regra já
    definida de que o histórico permanece) ou de `onDelete: Restrict` (o que travaria qualquer
    saída/remoção de quem já tenha ao menos 1 transação, inviabilizando a feature na prática). Saída
    e remoção, portanto, sempre fazem **soft delete** (`removedAt = now()`), nunca `delete`.
  - `@@unique([environmentId, userId])` — evita a mesma pessoa real ser convidada/adicionada duas
    vezes ao mesmo ambiente *enquanto ativa* (Postgres trata múltiplos `NULL` como distintos, então
    não afeta participantes). Como a saída agora é soft delete, essa constraint simples passaria a
    bloquear reentrada: se a pessoa sai (`removedAt` preenchido) e depois é convidada de novo, o
    par `(environmentId, userId)` já existe. Duas saídas possíveis: (a) índice único **parcial**
    (`WHERE removedAt IS NULL`, via SQL manual na migration, já que o Prisma não gera isso
    declarativamente), ou (b) ao reaceitar convite para um ambiente onde já existiu membership,
    reaproveitar a linha antiga (`removedAt = null`, `joinedAt` atualizado) em vez de criar uma
    nova. Prefiro (b): mais simples, sem precisar de SQL fora do schema Prisma, e mantém 1 única
    linha por pessoa/ambiente durante todo o ciclo de vida.
  - Listagens de membros ativos (`listMyEnvironments`, tela de gerenciamento) filtram
    `removedAt: null`. O field resolver que resolve `Transaction.member`/`Transaction.createdBy`
    **não filtra por `removedAt`** — uma transação antiga precisa continuar mostrando quem a lançou
    mesmo que essa pessoa já tenha saído do ambiente.
  - Em todo o código (resolvers/services/front), "é participante?" deve ser sempre derivado de
    `userId === null` — nunca checar a partir de `role` ser nulo, para não ter duas fontes de
    verdade podendo divergir.
- `EnvironmentInvite`: `id, environmentId (FK), invitedUserId (FK → User), invitedByUserId (FK →
  User), role (enum: admin | user — papel que o convidado terá ao aceitar), status (pending |
  accepted | declined | expired), expiresAt, createdAt`.
  - Sem o campo `role` aqui, a mutation de convite recebe o papel pretendido mas não haveria onde
    guardá-lo até o aceite — precisa persistir junto com o convite, não só como argumento solto na
    mutation de convite.
  - Só pode existir 1 convite com `status: pending` por par `(environmentId, invitedUserId)` —
    validar no `EnvironmentService` antes de criar um novo. Validar também que o convidado ainda
    não é membro daquele ambiente e que não está convidando a si mesmo.
  - Expiração (`expiresAt`) é checada de forma lazy no momento do aceite/recusa, mesmo padrão já
    usado em `resetCodeExpiry` no fluxo de reset de senha — não precisa de job/cron.
  - `environmentId` precisa de `onDelete: Cascade` — sem isso, excluir um ambiente que ainda tenha
    algum convite `pending` em aberto falharia por violação de FK (diferente de
    `EnvironmentMember`, aqui cascade é seguro: convite é só uma intenção, não carrega histórico
    financeiro referenciado por mais nada).

### Entidades alteradas

- `Category`: troca `userId` → `environmentId`. Constraint única passa de `[userId, title]` para
  `[environmentId, title]`.
- `Transaction`: troca `userId` → `environmentId` (onde a transação vive) + `createdBy` (renomeado
  do atual `userId`, FK → User, quem efetivamente lançou) + `memberId` (FK → EnvironmentMember, a
  quem a transação é atribuída — pode ser o próprio criador, outro membro real ou um participante).
  - Invariante que precisa ser validada no `TransactionService` (a FK por si só não garante isso):
    o `EnvironmentMember` referenciado em `memberId` precisa pertencer ao mesmo `environmentId` da
    transação — sem essa checagem seria possível atribuir uma transação de um ambiente a um membro
    de outro ambiente.

### Migração de dados existentes

1. Para cada `User` existente, criar um `Environment` (`isPersonal: true`, nome = nome do usuário)
   e um `EnvironmentMember(userId, role: admin)`.
2. Backfill de toda `Category`/`Transaction` existente: `environmentId` = ambiente pessoal recém
   criado do respectivo usuário; `createdBy` = valor atual de `userId`; `memberId` = id do
   `EnvironmentMember` do próprio usuário nesse ambiente.
3. Tornar `environmentId`/`createdBy` `NOT NULL` após o backfill. Em `Category`, a coluna `userId`
   é removida (sem substituto — categoria não guarda autor). Em `Transaction`, a coluna `userId`
   não é removida, e sim **renomeada** para `createdBy` (mesma FK para `User`, mesmo `NOT NULL`) —
   não há duas colunas concorrentes.
4. `register` (em `AuthService`) passa a criar automaticamente o `Environment` pessoal +
   `EnvironmentMember(role: admin)` do novo usuário, no mesmo fluxo de cadastro.

### Autorização

- Novo helper `assertEnvironmentAccess(environmentId, userId)`: confirma que existe um
  `EnvironmentMember` **ativo** (`removedAt: null`, não participante) com esse `userId` nesse
  ambiente; lança `GraphQLError` (`extensions.code: "FORBIDDEN"`) caso contrário. Substitui a
  checagem manual
  `registro.userId !== userId` repetida hoje em `TransactionService`/`CategoryService` — paga a
  dívida técnica já apontada no `CLAUDE.md` do backend.
- Novo helper `assertEnvironmentAdmin(environmentId, userId)`: mesma base de
  `assertEnvironmentAccess`, mas também exige `role: admin` no `EnvironmentMember` ativo. Usado nas
  mutations restritas a Admin (convidar, remover membro, criar/remover participante, renomear,
  excluir, promover, cancelar convite).
- `promoteToAdmin(environmentId, memberId)` precisa validar que o `EnvironmentMember` alvo tem
  `userId` preenchido (é membro real, não participante) antes de promover — promover um
  participante a Admin criaria um "admin" que nunca pode logar nem agir, um estado sem sentido que
  a FK não impede por si só.
- `removeMember`/`removeParticipant` operam na mesma tabela `EnvironmentMember`; cada uma deve
  validar que o `memberId` recebido é do tipo esperado (`removeMember` só aceita `userId`
  preenchido; `removeParticipant` só aceita `userId` nulo) — sem essa checagem, seria possível
  remover um participante chamando `removeMember` (ou vice-versa) sem a mutation certa aplicar as
  regras daquele caminho (ex.: guarda de "último Admin" não faz sentido pra participante).

### Regras de negócio do ambiente

- **Ambiente pessoal**: sempre existe (criado no registro), nunca aceita convite, nunca é
  excluído, nunca tem mais de um membro.
- **Múltiplos Admins**: um ambiente conjunto pode ter mais de um Admin simultaneamente — não há
  conceito de "dono único".
- **Convite**: só Admin convida; somente por e-mail de usuário já cadastrado (erro claro se o
  e-mail não corresponder a uma conta existente). Cria `EnvironmentInvite` e dispara e-mail via
  `EmailService` (reaproveitando o padrão já usado no reset de senha).
- **Aceite**: como o modelo é N:N (usuário pode pertencer a quantos ambientes quiser), aceitar o
  convite cria (ou **reativa**, se já existir uma linha com `removedAt` preenchido de uma
  passagem anterior por aquele ambiente — ver `@@unique([environmentId, userId])` na seção de
  entidades) o `EnvironmentMember` do convidado nesse ambiente — não existe merge nem
  arquivamento de nada. Importante: nunca um `create` incondicional — como a constraint única é
  sobre a tabela inteira (não só sobre linhas ativas), um `create` quando já existe linha antiga
  do mesmo par `(environmentId, userId)` falharia com violação de unicidade; o service precisa de
  um upsert (`findFirst` por `(environmentId, userId)` → `update removedAt: null` se existir,
  senão `create`). A conta pessoal e qualquer outro ambiente do convidado permanecem exatamente
  como estavam; se for a primeira vez nesse ambiente, ele nasce sem nenhum dado do convidado,
  igual ao comportamento já descrito para a criação de um ambiente novo.
- **Recusa/expiração**: `status` do convite ganha o valor `declined` além de `pending`/`accepted`/
  `expired`; mutation `declineEnvironmentInvite(inviteId)` marca o convite como recusado sem criar
  membership. Um convite `pending` expirado não bloqueia a lista de convites do convidado — o
  aceite/recusa verifica `expiresAt` no momento da ação e retorna erro claro se já expirou.
- **Participante sem login**: Admin cria `EnvironmentMember(userId: null, displayName)`. Serve só
  para atribuição (`memberId` em `Transaction`) e deve poder ser usado em agrupamentos de
  relatório por membro. `removeParticipant` está sujeito exatamente ao mesmo risco de integridade
  descrito para `removeMember`/`leaveEnvironment` (participante também pode ser referenciado por
  `Transaction.memberId`) — precisa ser soft delete (`removedAt = now()`) também, nunca `delete`
  físico. Fácil de esquecer porque participante "parece" um dado mais descartável que um membro
  real, mas a FK não faz essa distinção.
- **Saída do ambiente**:
  - Se existe outro Admin no ambiente, qualquer Admin sai livremente.
  - Se quem sai é o último Admin e existem outros membros, a mutation exige um
    `newAdminMemberId` (validado como membro real do ambiente) antes de concluir.
  - Se é o único membro do ambiente, saída não é permitida — só resta excluir.
- **Remoção de membro**: mesma mecânica da saída voluntária, iniciada por um Admin. Um Admin não
  pode se auto-remover por essa mutation (usa `leaveEnvironment` para isso). Remover outro membro
  segue a mesma guarda de `leaveEnvironment`: se o removido for o último Admin e ainda restarem
  outros membros, a remoção é bloqueada até que outro membro seja promovido a Admin primeiro — um
  ambiente com membros nunca pode ficar sem nenhum Admin. Se no futuro existir uma mutation de
  **demover** um Admin para User, ela precisa da mesma guarda. Tanto saída quanto remoção fazem
  soft delete (`removedAt = now()`), nunca `delete` — ver justificativa na seção de entidades.
- **Exclusão do ambiente**: permitida só quando restar exatamente 1 membro real **ativo**
  (`removedAt: null`; participantes não contam). Operação atômica via `$transaction` (mesmo padrão
  de `deleteCategory`), com cascade delete de `Category`/`Transaction` — aqui sim é delete de
  verdade, já que é a exclusão do ambiente inteiro, não a saída de uma pessoa.
- **Ambiente padrão no login**: novo campo `User.defaultEnvironmentId` (nullable, FK →
  Environment, `onDelete: SetNull`). Se nulo, ou se o usuário perdeu acesso a esse ambiente, a
  sessão cai no ambiente pessoal. O `onDelete: SetNull` é necessário: sem ele, excluir um ambiente
  que seja o padrão de alguém falharia por violação de FK — com ele, o campo simplesmente volta a
  `null` e o login já cai de volta no pessoal pela regra acima.

### Schema GraphQL (TypeGraphQL)

Novos types/inputs (resumo, schema gerado automaticamente por `emitSchemaFile` — não editar
`schema.graphql` manualmente):

```graphql
type EnvironmentModel {
  id: ID!
  name: String!
  isPersonal: Boolean!
  members: [EnvironmentMemberModel!]!
}

type EnvironmentMemberModel {
  id: ID!
  role: String
  displayName: String
  user: UserModel
  joinedAt: DateTimeISO!
}

type EnvironmentInviteModel {
  id: ID!
  environment: EnvironmentModel!
  invitedBy: UserModel!
  role: String!
  expiresAt: DateTimeISO!
  createdAt: DateTimeISO!
}

input CreateEnvironmentInput { name: String! }
input InviteMemberInput { environmentId: String!, email: String!, role: String! }
input CreateParticipantInput { environmentId: String!, displayName: String! }
```

`EnvironmentInviteModel` faltava no desenho original — sem ela, `listMyPendingInvites` não teria
tipo de retorno, e o frontend não teria como exibir "nome do ambiente / quem convidou / papel
oferecido" na lista de convites pendentes. `environment`/`invitedBy` resolvidos como field
resolvers, mesmo padrão de `category` em `TransactionResolver`.

Mutations novas: `createEnvironment`, `inviteMember`, `cancelEnvironmentInvite(inviteId)`,
`acceptEnvironmentInvite(inviteId)`, `declineEnvironmentInvite(inviteId)`,
`promoteToAdmin(environmentId, memberId)`, `removeMember(environmentId, memberId)`,
`leaveEnvironment(environmentId, newAdminMemberId: String)`, `deleteEnvironment(environmentId)`,
`createParticipant`, `removeParticipant`, `renameEnvironment`,
`setDefaultEnvironment(environmentId)`.

`cancelEnvironmentInvite` é Admin only e só se aplica a convite `status: pending` — ao contrário
de `EnvironmentMember`, nada referencia `EnvironmentInvite.id` por FK em outra tabela, então
cancelar pode ser `delete` físico direto, sem o problema de integridade do soft delete. Como a
mutation recebe só `inviteId` (sem `environmentId`), a checagem de Admin precisa buscar o convite
primeiro e usar o `environmentId` *dele* para `assertEnvironmentAdmin` — nunca confiar num
`environmentId` vindo separado do client, mesmo padrão já seguido pra `userId` no `CLAUDE.md` do
backend.

Queries novas: `listMyEnvironments`, `listMyPendingInvites` (convites `pending` endereçados ao
usuário logado — necessário pro frontend ter onde exibir/aceitar/recusar) e
`listEnvironmentInvites(environmentId)` (Admin only; convites `pending` enviados *daquele*
ambiente — sem ela, quem convida não tem como saber o que já enviou nem cancelar).

`setDefaultEnvironment` valida que o `environmentId` informado é um ambiente ao qual o usuário
pertence (via `assertEnvironmentAccess`) antes de gravar — não pode apontar pra um ambiente que o
usuário não acessa.

Alterações em mutations existentes: `CreateTransactionInput`/`CreateCategoryInput` ganham
`environmentId: String!` obrigatório; `CreateTransactionInput` ganha `memberId: String!` (a quem a
transação é atribuída). `TransactionModel` passa a expor `createdBy: UserModel!` e
`member: EnvironmentMemberModel!` como field resolvers (seguindo o padrão já usado em
`category` dentro de `TransactionResolver`).

## Arquivos/áreas afetadas

- `prisma/schema.prisma` — novos models `Environment`, `EnvironmentMember`, `EnvironmentInvite`;
  alteração de `Category`/`Transaction`/`User`.
- `prisma/migrations/` — nova migration com o backfill descrito (script de dados, não só DDL).
- `src/models/` — `environment.model.ts`, `environment-member.model.ts`,
  `environment-invite.model.ts`.
- `src/dto/input/` — `environment.input.ts`; alteração de `transaction.input.ts`/`category.input.ts`.
- `src/resolvers/` — novo `environment.resolver.ts`; alteração de `transaction.resolver.ts`/
  `category.resolver.ts` (novos field resolvers, `environmentId` nos args).
- `src/services/` — novo `environment.service.ts` (concentra convite/saída/promoção/exclusão);
  alteração de `transaction.service.ts`/`category.service.ts` (troca de `userId` por
  `environmentId` + uso do novo helper de autorização).
- `src/services/auth.service.ts` — criação automática do ambiente pessoal no `register`.
- `src/utils/` — novo helper `environment-access.ts` (`assertEnvironmentAccess`/
  `assertEnvironmentAdmin`).

## Riscos e alternativas consideradas

- **Alternativa descartada: ambiente conjunto como "conversão" da conta pessoal.** Primeira
  proposta discutida — exigia que cada usuário pertencesse a só 1 ambiente por vez, forçando
  decisão de merge/arquivamento logo na entrada e impedindo pertencer a múltiplos ambientes
  simultaneamente. Descartada a favor do modelo N:N com ambiente pessoal fixo e nunca convertido.
- **Alternativa descartada: 1 Admin fixo por ambiente.** Descartada a pedido explícito do usuário;
  múltiplos Admins exigem regra de saída condicional (só pede sucessor se for o último Admin) em
  vez de sempre pedir.
- **Alternativa descartada: aceite de convite com escolha de merge/arquivamento de histórico.**
  Fazia sentido só sob o modelo 1:1 (usuário só podia estar em 1 ambiente, logo precisava decidir o
  que fazer com o anterior). Com o modelo N:N atual, essa decisão nunca existiu de fato — ela foi
  removida do fluxo de aceite (ver "Regras de negócio do ambiente").
- **Risco de migração**: o backfill roda sobre dados reais de usuários já existentes — precisa ser
  testado antes em cópia do banco, e executado numa única transação para evitar estado parcial
  (usuários com ambiente pessoal e usuários sem, a meio da migração). Diferente da migration atual
  (`20261009135224_init`, só DDL), essa é uma migration de dados — Prisma Migrate não roda DML
  automaticamente, então precisa de um script separado (ex.: `prisma/migrations/.../migration.sql`
  com os `INSERT`/`UPDATE` do backfill, ou um script Node executado manualmente antes de aplicar o
  `NOT NULL`) rodado uma única vez em produção, com plano de rollback caso falhe no meio.
- **Risco de autorização**: trocar a checagem de `userId` direto para `EnvironmentMember` é
  sensível; testar explicitamente o cenário de um membro removido/sem acesso ainda tentando operar
  com um `environmentId` antigo guardado em cache no client.
- **Risco de integridade descoberto na revisão**: apagar a linha de `EnvironmentMember` na saída/
  remoção quebraria `Transaction.memberId` (cascade apagaria histórico financeiro real; restrict
  travaria a saída de qualquer pessoa com transações). Resolvido com soft delete (`removedAt`) em
  vez de delete físico — ver seção de entidades. O mesmo risco se aplica a `removeParticipant`
  (mesma tabela, mesma FK) e precisa da mesma solução. Testar explicitamente: sair de um ambiente
  (ou remover um participante) com transações já atribuídas não deve apagar nem bloquear nada, e
  reaceitar convite para um ambiente de onde já se saiu antes não deve falhar por violação de
  unicidade.
- **Constraint `userId` XOR `displayName` em `EnvironmentMember`**: se não for viável como check
  declarativo no banco, a validação fica só em `EnvironmentService` — documentar o risco de
  inconsistência se algum código futuro escrever direto via `prismaClient.environmentMember.create`
  fora do service.
