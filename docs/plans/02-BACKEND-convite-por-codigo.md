# 02 - BACKEND - Convite por código (substitui convite por e-mail)

**Status:** Concluído — ver [registro de implementação](../../backend/docs/02-convite-por-codigo.md)
e [QA](../qa/02-QA-BACK-convite-por-codigo.md)
**Data:** 2026-10-19
**Plano irmão:** [02-FRONTEND-convite-por-codigo](./02-FRONTEND-convite-por-codigo.md)
**Depende de:** [01-BACKEND-ambientes-compartilhados](./01-BACKEND-ambientes-compartilhados.md) (já concluído)

## Objetivo

Substituir o mecanismo de convite por e-mail da tarefa 01 (`EnvironmentInvite`, por pessoa
específica, com envio de e-mail) por um **código de convite por ambiente**: um Admin gera um
código reutilizável, válido por 1 semana, que funciona como "porta de entrada" — qualquer usuário
autenticado que o possua pode entrar no ambiente. Gerar um código novo invalida o anterior.

Por segurança (alguém pode tentar adivinhar o código de um ambiente por tentativa e erro até
acertar), quem entra por código **nunca** recebe acesso direto aos dados do ambiente: entra numa
**terceira permissão, "pendente" (`pending`)**, sem conseguir ver nenhuma categoria/transação do
ambiente, até que um Admin aprove explicitamente essa pessoa (promovendo-a a `user`).

## Abordagem proposta

### Terceira permissão: `pending`

- `EnvironmentRole` passa de `admin | user` para `admin | user | pending`.
- `joinEnvironmentByCode` sempre cria/reativa o `EnvironmentMember` com `role: "pending"` — nunca
  `user` direto, mesmo que esse `userId` já tenha sido `user`/`admin` nesse mesmo ambiente antes
  (saiu e voltou). Reentrar por código é sempre tratado como não verificado de novo; simplicidade e
  postura de segurança consistente pesam mais do que economizar uma aprovação repetida.
- Um membro `pending`:
  - **Existe de verdade** como `EnvironmentMember` (`userId` preenchido, `removedAt: null`) —
    conta para os cálculos de "quantos membros reais ativos" (ex.: `deleteEnvironment` não libera
    para exclusão enquanto houver um `pending` pendente de decisão; é preciso aprovar ou remover
    primeiro).
  - **Aparece em `listMyEnvironments` para o próprio usuário** (precisa saber que está aguardando
    aprovação), mas **não consegue ler/escrever `Category`/`Transaction`** daquele ambiente.
  - **Pode sair livremente** (`leaveEnvironment`) — não há razão de segurança para impedir isso.
  - **Não pode ser alvo de `promoteToAdmin`** direto — precisa ser aprovado (`pending` → `user`)
    antes de poder ser promovido a `admin`. Evita que um Admin apressado promova alguém ainda não
    verificado.
  - **Não pode ser alvo de `memberId` em uma transação** — atribuir uma transação a alguém ainda
    não aprovado contradiz o próprio propósito da aprovação (seria dar visibilidade/relevância
    financeira a quem ainda não foi vetado).
  - **Pode ser removido livremente por um Admin** (`removeMember`, sem nenhuma mudança — o guard de
    "último Admin" nunca dispara pra alguém `pending`, já que `pending !== "admin"`).

### Dois níveis de checagem de acesso (`src/utils/environment-access.ts`)

A distinção entre "é membro" e "tem acesso aos dados" passa a ser real, então dois helpers:

- **`assertEnvironmentMember(environmentId, userId)`** (novo, checagem ampla): confirma que existe
  um `EnvironmentMember` ativo (`removedAt: null`, `userId` preenchido) **de qualquer `role`**,
  incluindo `pending`. Usado por operações de identidade/gestão da própria membership que não
  expõem dados do ambiente — hoje, só `leaveEnvironment`.
- **`assertEnvironmentAccess(environmentId, userId)`** (existente, agora mais estrito): exige
  `role: { in: ["admin", "user"] }` — **exclui `pending`**. Usado por tudo que hoje já usava (
  `TransactionService`, `CategoryService`, `setDefaultEnvironment`) — continua sendo a porta de
  dados do ambiente, só que agora de fato bloqueia quem está pendente.
  - Mensagem de erro diferenciada (só para UX, não é a garantia de segurança — essa é o bloqueio
    em si): se o `userId` tem uma membership `pending` nesse ambiente, a mensagem é "Seu acesso a
    este ambiente ainda não foi aprovado por um administrador." Se não é membro nenhum, continua a
    mensagem genérica "Você não tem acesso a este ambiente." (a mesma que o frontend já usa pra
    cair de volta no ambiente pessoal — ver plano de frontend; propositalmente **não** aciona esse
    fallback para quem está `pending`, porque o frontend deve tratar `pending` de forma explícita a
    partir do próprio `listMyEnvironments`, não reagindo a um erro).
- **`assertEnvironmentAdmin`**: sem mudança de implementação (continua construído sobre
  `assertEnvironmentAccess`) — `pending` nunca passaria no `role === "admin"` de qualquer forma.

### Nova mutation: aprovação

- **`approveMember(environmentId, memberId)`**: Admin only. Exige que o `EnvironmentMember` alvo
  pertença ao ambiente, esteja ativo, e tenha `role === "pending"` (senão: "Membro não encontrado
  ou já aprovado."). Define `role: "user"`.

### Guardas novas em operações existentes

- **`promoteToAdmin`**: ganha a checagem `target.role !== "user" → rejeitar` (hoje só rejeitava
  `userId === null`). Mensagem clara: "Aprove este membro antes de promovê-lo a administrador."
- **`assertMemberBelongsToEnvironment`** (em `TransactionService`, valida o `memberId` de uma
  transação): ganha a checagem `member.role === "pending" → rejeitar`. Participantes (`role: null`)
  continuam válidos como alvo — só `pending` é bloqueado.
- **`listActiveMembers`** (fonte do campo `members` em `EnvironmentModel`): passa a filtrar
  `role: { not: "pending" }` — a lista geral de membros (usada, por exemplo, para popular o select
  de "de quem é essa transação" no frontend) nunca inclui quem está pendente. Isso fecha por
  construção a classe de bug "esqueci de filtrar pending em algum lugar que lista membros",
  em vez de depender de cada consumidor lembrar de filtrar.
- **Novo field resolver `EnvironmentModel.pendingMembers`**: lista só os `role: "pending"` ativos
  do ambiente. **Admin only** (`assertEnvironmentAdmin` dentro do resolver) — diferente de
  `members`, que qualquer membro ativo pode ver; só um Admin deveria saber quem está tentando
  entrar, membros comuns não precisam disso.
- **Achado de segurança desta rodada de revisão — `members`/`pendingMembers` precisam checar
  acesso por conta própria, não só confiar em quem chamou antes**: na tarefa 01, `members` nunca
  tinha checagem de acesso própria porque a única forma de obter um `EnvironmentModel` era
  `listMyEnvironments`, que já é auto-escopada ao próprio usuário — então era seguro "por
  acidente". Esta tarefa introduz `getEnvironmentByInviteCode`, que **devolve um
  `EnvironmentModel` pra quem ainda não é membro, de propósito** (é o preview antes de entrar). Se
  `members`/`pendingMembers` continuarem sem checagem própria, qualquer pessoa com um código válido
  (ou um código adivinhado) poderia pedir `getEnvironmentByInviteCode(code) { members { user {
  name email } } } }` e ver nome/e-mail de todo mundo do ambiente **antes mesmo de entrar** —
  vazamento de PII pra quem nem é membro ainda.
  - **Correção**: os dois field resolvers passam a receber `@GqlUser() user` e chamar,
    respectivamente, `assertEnvironmentAccess(environment.id, user.id)` (`members`) e
    `assertEnvironmentAdmin(environment.id, user.id)` (`pendingMembers`) antes de retornar
    qualquer coisa — do mesmo jeito que todo outro resolver sensível do agregado já faz. Chamando
    por `listMyEnvironments` (próprio usuário, já aprovado) ou por `getEnvironmentByInviteCode`
    (ainda não é membro), o resultado passa a ser o mesmo: só quem já tem `role` `admin`/`user`
    (ou `admin`, no caso de `pendingMembers`) naquele ambiente específico recebe a lista.
  - `id`/`name`/`isPersonal`/`createdAt`/`updatedAt` em `EnvironmentModel` continuam sem essa
    checagem — são exatamente os campos que o preview precisa expor de propósito (mostrar o nome
    antes de confirmar a entrada); só os dois campos que carregam dados de outras pessoas
    precisavam da guarda.

### Geração/entrada por código — sem alteração em relação à versão anterior deste plano

- `EnvironmentInviteCode` (`environmentId` como chave primária, `code` único globalmente,
  `expiresAt`), geração por `generateEnvironmentInviteCode` (Admin only, bloqueado no ambiente
  pessoal, upsert — gerar um novo substitui o anterior), preview sem efeito colateral via
  `getEnvironmentByInviteCode`, e entrada efetiva via `joinEnvironmentByCode` (agora criando
  `role: "pending"`, não `user` — única mudança em relação à primeira versão deste plano).
- Remoção de `EnvironmentInvite`/e-mail — sem alteração (ver seção abaixo, mantida da primeira
  versão).

### Remoção do convite por e-mail (mantido da primeira versão deste plano)

- Model Prisma `EnvironmentInvite` e enum `EnvironmentInviteStatus` — removidos.
- `EnvironmentInviteModel`, `InviteMemberInput` — removidos.
- Mutations/queries removidas: `inviteMember`, `cancelEnvironmentInvite`,
  `acceptEnvironmentInvite`, `declineEnvironmentInvite`, `listMyPendingInvites`,
  `listEnvironmentInvites`.
- `EnvironmentInviteResolver` — removido. Métodos correspondentes em `EnvironmentService`
  removidos.
- `EmailService.sendEnvironmentInviteEmail` (e o template HTML associado) — removido.
  `sendForgotPasswordEmail` **não é tocado** — fora do escopo, o solicitante decide depois.

### Rate limiting de tentativas de código — explicitamente adiado

O solicitante propôs um limite de tentativas (5 erradas → espera 10 min, podendo crescer a cada
nova rodada de erros) como proteção complementar contra força bruta do código. **Adiado a pedido
explícito** — não faz parte desta tarefa, nenhuma mudança de schema/infraestrutura agora. Registrar
como pendência explícita (ver "Riscos" abaixo) para uma tarefa futura.

### Nova entidade: `EnvironmentInviteCode`

```prisma
model EnvironmentInviteCode {
  environmentId   String      @id
  environment     Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  code            String      @unique
  createdByUserId String
  createdByUser   User        @relation(fields: [createdByUserId], references: [id], onDelete: Cascade)
  expiresAt       DateTime
  createdAt       DateTime    @default(now())
}
```

- `environmentId` como chave primária garante **no máximo 1 código ativo por ambiente** — gerar um
  código novo é um `upsert` que substitui `code`/`expiresAt`/`createdByUserId`/`createdAt` na
  mesma linha, nunca cria uma segunda. Implementa diretamente a decisão de que gerar um código
  novo invalida o anterior.
- `code` é `@unique` **globalmente**.
- Geração: string aleatória de 8 caracteres usando o alfabeto
  `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (32 símbolos, sem `0`/`O`, `1`/`I`/`L`). ~32⁸ ≈ 1,1 × 10¹²
  combinações possíveis. Colisão com um código já existente de **outro** ambiente é
  extremamente improvável, mas trivial de tratar: gerar de novo e tentar outra vez (poucas
  tentativas bastam) em vez de deixar o `unique` do banco estourar um erro cru pro Admin.
- Reentrada usa o mesmo upsert de `EnvironmentMember` já implementado em `acceptEnvironmentInvite`
  na tarefa 01 (reativa a linha soft-deletada em vez de criar uma nova, por causa do
  `@@unique([environmentId, userId])`) — só que agora sempre com `role: "pending"`, nunca
  preservando um `role` anterior que a pessoa possa ter tido antes de sair.

### Regras de negócio

- **`generateEnvironmentInviteCode(environmentId)`**: Admin only. Bloqueado no ambiente pessoal.
  `upsert`: `expiresAt = now() + 7 dias`, código novo, `createdByUserId` atualizado.
- **`getCurrentInviteCode(environmentId)`** (query, nova — achado desta rodada de revisão): Admin
  only. Retorna o `EnvironmentInviteCode` atual do ambiente (`null` se nunca foi gerado, ou se o
  que existe já expirou — nesse caso o frontend trata como "sem código ativo", igual a nunca ter
  gerado). Sem essa query, a tela de gerenciamento só teria acesso ao código no instante em que
  `generateEnvironmentInviteCode` é chamado — ao sair e voltar pra tela (ou abrir em outra aba), um
  Admin não teria como ver de novo o código que já compartilhou, e a única ação disponível seria
  gerar um novo, **invalidando** o que a família já estava usando. Só leitura, nenhum efeito
  colateral, nunca gera nem substitui nada — simetria com `getEnvironmentByInviteCode`, que também
  é só leitura.
- **`getEnvironmentByInviteCode(code)`** (query): exige usuário autenticado, não exige ser membro.
  Valida existência e `expiresAt > now()`; retorna o `EnvironmentModel` (nome, id) sem criar
  nenhum vínculo.
- **`joinEnvironmentByCode(code)`** (mutation): revalida o código do zero. Se válido:
  - **Se já existe um `EnvironmentMember` ativo** (`removedAt: null`, qualquer `role` —
    `admin`/`user`/`pending`) para esse `userId` nesse ambiente: **não faz nada com o `role`**,
    retorna o `EnvironmentModel` como um no-op idempotente. Achado desta rodada de revisão: sem
    essa checagem, alguém que já é `user`/`admin` aprovado e usa o código de novo (por engano, ou
    por reaproveitar um link antigo) seria **rebaixado pra `pending`** pelo upsert — uma
    auto-demoção destrutiva e sem sentido. Na tarefa 01 isso não existia como risco porque o
    convite por e-mail já bloqueava convidar quem já era membro antes de gerar o convite; código
    não tem esse pré-check porque não é direcionado a uma pessoa específica.
  - **Se não existe nenhum `EnvironmentMember`, ou existe um soft-deletado** (`removedAt`
    preenchido): cria/reativa com `role: "pending"` (mesmo upsert de sempre).
- O código informado é normalizado (`trim` + uppercase) antes de qualquer consulta, nas duas
  operações — o alfabeto de geração já é só maiúsculas, mas alguém digitando manualmente pode
  perfeitamente teclar minúsculo ou deixar espaço em branco ao colar.
- Expiração checada de forma lazy nas duas operações acima. Sem job/cron.

### Schema GraphQL (TypeGraphQL)

```graphql
type EnvironmentInviteCodeModel {
  environmentId: String!
  code: String!
  expiresAt: DateTimeISO!
  createdAt: DateTimeISO!
}
```

`environmentId` incluído por consistência com os demais types do schema (todos têm algum campo
identificador) — não é estritamente necessário pra esta tarefa, mas evita um type sem nenhuma
chave caso o frontend precise normalizar isso no cache do Apollo depois.

- `generateEnvironmentInviteCode(environmentId: String!): EnvironmentInviteCodeModel!`
- `getCurrentInviteCode(environmentId: String!): EnvironmentInviteCodeModel` (query, nullable)
- `getEnvironmentByInviteCode(code: String!): EnvironmentModel!` (query)
- `joinEnvironmentByCode(code: String!): EnvironmentModel!` (mutation)
- `approveMember(environmentId: String!, memberId: String!): EnvironmentMemberModel!`

`EnvironmentModel` ganha o field resolver `pendingMembers: [EnvironmentMemberModel!]!` (Admin
only), ao lado do já existente `members` (agora filtrando `pending` para fora).

### Migração

Nova migration: `DROP TABLE "EnvironmentInvite"`, `DROP TYPE "EnvironmentInviteStatus"`,
`CREATE TABLE "EnvironmentInviteCode"`, `ALTER TYPE "EnvironmentRole" ADD VALUE 'pending'`. Sem
backfill — convites pendentes em andamento não são histórico financeiro, perdê-los é aceitável.

Removendo `EnvironmentInvite`, também é preciso remover as duas relações que `User` mantém com
ele (`sentInvites EnvironmentInvite[] @relation("EnvironmentInviteInvitedByUser")` e
`receivedInvites EnvironmentInvite[] @relation("EnvironmentInviteInvitedUser")`, adicionadas na
tarefa 01) — sem isso, o `schema.prisma` fica com relações apontando para um model que não existe
mais e o `prisma generate`/`migrate` falha na validação do schema antes de chegar a gerar nada.

## Arquivos/áreas afetadas

- `prisma/schema.prisma` — remove `EnvironmentInvite`/`EnvironmentInviteStatus`, adiciona
  `EnvironmentInviteCode`, adiciona `pending` ao enum `EnvironmentRole`.
- `prisma/migrations/` — nova migration.
- `src/models/environment-invite.model.ts` — removido; `src/models/environment-invite-code.model.ts`
  — novo.
- `src/dto/input/environment.input.ts` — remove `InviteMemberInput`.
- `src/resolvers/environment.resolver.ts` — remove `EnvironmentInviteResolver` e os métodos de
  convite de `EnvironmentResolver`; adiciona `generateEnvironmentInviteCode`,
  `getCurrentInviteCode`, `getEnvironmentByInviteCode`, `joinEnvironmentByCode`, `approveMember`,
  field resolver `pendingMembers`.
- `src/services/environment.service.ts` — remove os métodos de convite por e-mail; adiciona
  `generateEnvironmentInviteCode`, `getCurrentInviteCode`, `getEnvironmentByInviteCode`,
  `joinEnvironmentByCode`, `approveMember`, `listPendingMembers`; ajusta `promoteToAdmin` (guarda
  nova) e `listActiveMembers` (filtro de `pending`).
- `src/services/transaction.service.ts` — `assertMemberBelongsToEnvironment` ganha a checagem de
  `role === "pending"`.
- `src/services/email.service.ts` — remove `sendEnvironmentInviteEmail` e o template associado.
- `src/utils/environment-access.ts` — novo helper `assertEnvironmentMember`; `assertEnvironmentAccess`
  passa a filtrar por `role` e diferenciar a mensagem de erro.

## Riscos e alternativas consideradas

- **Rate limiting de tentativas — adiado**: registrado explicitamente como pendência para uma
  tarefa futura (ex.: tarefa 03), a pedido do solicitante. Sem essa proteção, o único obstáculo a
  tentativas de força bruta do código é o espaço de busca (32⁸) e a expiração de 1 semana — a
  permissão `pending` é a mitigação real desta tarefa (mesmo que alguém acerte um código, não
  ganha acesso a dado nenhum sem aprovação humana).
- **Reentrada sempre volta como `pending`, mesmo para quem já foi `user`/`admin` antes**: decisão
  deliberada de simplicidade e postura de segurança consistente (ver seção acima) — alternativa
  descartada seria preservar o `role` anterior ao reativar a linha soft-deletada, mas isso abriria
  uma exceção silenciosa à proteção que esta tarefa inteira existe para criar.
- **`members` filtra `pending` na fonte, em vez de depender de cada consumidor filtrar**:
  decisão deliberada depois de identificar que esquecer de filtrar em algum lugar (ex.: o select de
  atribuição de transação no frontend) exporia indevidamente quem ainda não foi aprovado. Custo:
  uma segunda função/field resolver (`pendingMembers`) a manter.
- **Mensagem de erro diferenciada em `assertEnvironmentAccess` é só UX, não a garantia de
  segurança** — mesmo que o frontend nunca trate essa mensagem especificamente, o bloqueio de
  acesso real já está garantido pelo filtro de `role` na query; registrar isso evita que uma
  implementação futura pense que a string da mensagem é o mecanismo de proteção.
- **Alternativa descartada: código de uso único por pessoa / múltiplos códigos simultâneos /
  papel escolhido na geração do código.** Todas rejeitadas a pedido explícito do solicitante na
  rodada anterior de refinamento — mantidas aqui.
- **Risco de migração destrutiva**: apagar `EnvironmentInvite` descarta qualquer convite pendente
  de teste já no banco. Aceitável — não é histórico financeiro nem dado de produção real.
- **Risco de auto-demoção descoberto nesta rodada**: `joinEnvironmentByCode` sem a checagem de
  "já é membro ativo" rebaixaria um `user`/`admin` existente pra `pending` ao reusar o código —
  corrigido exigindo que o upsert só se aplique quando não há linha ativa (ver "Regras de
  negócio"). Testar explicitamente: um `user` ou `admin` ativo que usa o código do próprio
  ambiente de novo não perde o papel.
- **Lacuna descoberta nesta rodada — faltava uma forma de consultar o código sem gerar um novo**:
  a primeira versão desta seção só tinha `generateEnvironmentInviteCode` (sempre gera/substitui) e
  as duas operações do lado de quem entra. Nada permitia ao Admin simplesmente *ver* o código
  atual ao reabrir a tela de gerenciamento — a única ação disponível teria sido gerar de novo,
  invalidando por acidente um código que já estava em uso. Corrigido com `getCurrentInviteCode`
  (query, só leitura, Admin only).
