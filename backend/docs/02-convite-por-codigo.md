# Convite por código (substitui convite por e-mail)

**Data:** 2026-10-19
**Plano:** [02-BACKEND-convite-por-codigo](../../docs/plans/02-BACKEND-convite-por-codigo.md)

## O que foi feito

- **Prisma (`prisma/schema.prisma`)**: `EnvironmentInvite`/`EnvironmentInviteStatus` removidos
  (junto com `User.sentInvites`/`User.receivedInvites` e `Environment.invites`, as relações que
  apontavam pra ele). `EnvironmentRole` ganha o valor `pending`. Novo model
  `EnvironmentInviteCode` (`environmentId` como chave primária — no máximo 1 código ativo por
  ambiente — `code` único globalmente, `createdByUserId`, `expiresAt`), com relação inversa
  `Environment.inviteCode` e `User.createdInviteCodes`.
- **Migration manual** (`prisma/migrations/20261019143116_convite_por_codigo/migration.sql`): dropa
  a tabela/enum antigos, adiciona `pending` ao enum `EnvironmentRole`, cria `EnvironmentInviteCode`.
  Sem backfill (convites pendentes em andamento não são histórico financeiro). Gerada com `prisma
  migrate diff --from-url ... --to-schema-datamodel schema.prisma --script` pra conferir o DDL
  exato e aplicada com `prisma migrate deploy` — mesmo motivo de `migrate dev` ser inviável em
  ambiente não-interativo já registrado em
  [01-ambientes-compartilhados.md](./01-ambientes-compartilhados.md).
- **`src/utils/invite-code.ts`** (novo): `generateInviteCode` (string aleatória de 8 caracteres,
  alfabeto sem `0/O/1/I/L`, via `crypto.randomInt`) e `normalizeInviteCode` (`trim` + uppercase) —
  lógica pura, sem Prisma, seguindo a convenção de `src/utils` do projeto.
- **`src/utils/environment-access.ts`**: `assertEnvironmentAccess` passa a exigir `role: {admin,
  user}` (exclui `pending`), com mensagem diferenciada pra quem está `pending` (só UX — o bloqueio
  real é o filtro de `role`). Novo `assertEnvironmentMember` (checagem ampla, qualquer `role`
  incluindo `pending`) usado por `leaveEnvironment`. `assertEnvironmentAdmin` sem mudança de
  implementação. Dois novos helpers booleanos (nunca lançam) `hasEnvironmentAccess`/
  `isEnvironmentAdmin` — ver "Achado durante QA" abaixo.
- **`src/services/environment.service.ts`**: removidos `inviteMember`,
  `cancelEnvironmentInvite`, `listMyPendingInvites`, `listEnvironmentInvites`,
  `acceptEnvironmentInvite`, `declineEnvironmentInvite` e a dependência de `EmailService` (não há
  mais nenhum e-mail enviado neste fluxo). Adicionados `generateEnvironmentInviteCode` (Admin only,
  bloqueado no ambiente pessoal, upsert com retry em caso de colisão de `code`),
  `getCurrentInviteCode` (Admin only, só leitura, `null` se nunca gerado ou expirado),
  `getEnvironmentByInviteCode` (preview, exige autenticação via `IsAuth` no resolver, não exige
  membership), `joinEnvironmentByCode` (cria/reativa como `pending`, com a checagem de
  "já é membro ativo" — ver "Achado crítico" abaixo), `approveMember` (Admin only, `pending` →
  `user`) e `listPendingMembers` (Admin only). `listActiveMembers` passa a filtrar `role: { not:
  "pending" }`. `promoteToAdmin` ganha a checagem `target.role !== "user"`. `leaveEnvironment` troca
  `assertEnvironmentAccess` por `assertEnvironmentMember` (checagem ampla — `pending` pode sair).
  `deleteEnvironment` não precisou de nenhuma mudança: a contagem de "membros reais ativos" já
  inclui `pending` (tem `userId` preenchido), então já bloqueava a exclusão corretamente.
- **`src/services/transaction.service.ts`**: `assertMemberBelongsToEnvironment` ganha a checagem
  `member.role === "pending"` → rejeita (participantes, `role: null`, continuam válidos).
- **`src/services/email.service.ts`**: `sendEnvironmentInviteEmail` e o template HTML associado
  removidos. `sendForgotPasswordEmail` intocado.
- **Models/DTOs**: `environment-invite.model.ts` removido; `environment-invite-code.model.ts`
  (novo) — `EnvironmentInviteCodeModel` (`environmentId`, `code`, `expiresAt`, `createdAt`).
  `InviteMemberInput` removido de `environment.input.ts`. `EnvironmentModel` ganha `members`/
  `pendingMembers` nullable (ver "Achado durante QA" abaixo).
- **`src/resolvers/environment.resolver.ts`**: `EnvironmentInviteResolver` e os métodos de convite
  por e-mail removidos. Adicionadas as mutations `generateEnvironmentInviteCode`,
  `joinEnvironmentByCode`, `approveMember` e as queries `getCurrentInviteCode` (nullable),
  `getEnvironmentByInviteCode`. Novo field resolver `pendingMembers` (Admin only). Field resolver
  `members` passa a checar acesso por conta própria antes de devolver qualquer coisa. `src/index.ts`
  atualizado (resolver removido do `buildSchema`).
- **`scripts/qa-convite-por-codigo.ts`** (novo, mantido no repositório para reuso futuro, mesmo
  padrão de `scripts/qa-ambientes-compartilhados.ts`): 62 verificações cobrindo os riscos do plano.
  `scripts/qa-ambientes-compartilhados.ts`/`qa-cleanup-all.ts` (tarefa 01) tiveram as referências a
  `prismaClient.environmentInvite` (model removido) trocadas por `environmentInviteCode` só pra
  manter a compilação — o script da tarefa 01 fica permanentemente obsoleto a partir do passo que
  testava `inviteMember`/`acceptEnvironmentInvite` (mutations removidas), o que é esperado: a
  feature que ele testava foi substituída por esta tarefa.

## Por que foi feito

O convite por e-mail da tarefa 01 exigia saber de antemão o e-mail de cada pessoa a convidar, uma
mutation por pessoa, e dependia do provedor de e-mail (Resend) entregar a mensagem. Pra um caso de
uso de "conta conjunta" (família, casal), um código reutilizável que qualquer pessoa com ele possa
usar é mais simples de compartilhar (ex.: por WhatsApp) e não depende de e-mail. Por segurança
(alguém pode tentar adivinhar o código por tentativa e erro), quem entra por código não ganha
acesso direto aos dados — fica `pending` até um Admin aprovar explicitamente.

## Por que esse caminho foi escolhido

- **`pending` como `EnvironmentRole` real, não um status de convite separado**: permite reusar
  toda a infraestrutura já existente de `EnvironmentMember` (soft delete, `@@unique`, contagem de
  membros ativos) sem duplicar conceitos — "é membro?" continua sendo `removedAt: null`, só "tem
  acesso aos dados?" passou a depender também do `role`.
- **Dois níveis de checagem (`assertEnvironmentMember` vs. `assertEnvironmentAccess`)** em vez de
  uma função só com um parâmetro "permitir pending?": deixa explícito, no próprio nome da função
  chamada em cada service, se aquela operação expõe dados do ambiente ou não — `leaveEnvironment`
  (identidade) vs. tudo que já existia (dados). Mais simples de auditar do que um booleano extra em
  toda chamada.
- **`joinEnvironmentByCode` sempre cria/reativa como `pending`, mesmo para quem já foi
  `user`/`admin` antes**: decisão deliberada de simplicidade e postura de segurança consistente —
  preservar o `role` anterior ao reentrar abriria uma exceção silenciosa à proteção que esta tarefa
  inteira existe para criar. Custo aceito: quem sai e reentra precisa ser aprovado de novo.
- **`EnvironmentInviteCode.environmentId` como chave primária** (em vez de `id` próprio +
  `@@unique([environmentId])`): garante "no máximo 1 código ativo por ambiente" diretamente pela
  estrutura da tabela, sem depender de nenhuma lógica de aplicação pra não duplicar — gerar um novo
  é sempre um `upsert` na mesma linha.
- **`listActiveMembers` filtra `pending` na fonte** (não em cada consumidor): fecha por construção
  a classe de bug "esqueci de filtrar `pending` em algum lugar que lista membros" — doc completo
  dessa decisão já está no próprio plano aprovado.
- **Migration sem backfill**: convites pendentes (tarefa 01) e qualquer `pending` futuro não são
  histórico financeiro — perder convites em andamento na migração é aceitável, igual já registrado
  no plano.

## Achado crítico confirmado em QA: reusar o código não pode rebaixar quem já é membro ativo

O plano já previa esse risco (ver seção "Riscos" do plano aprovado) e pedia a checagem explícita
antes do upsert em `joinEnvironmentByCode`: se já existe um `EnvironmentMember` ativo (qualquer
`role`) pra aquele `userId` naquele ambiente, a mutation é um no-op — devolve o ambiente sem tocar
no `role`. Implementado e **confirmado por teste real**: um `admin` original e um membro promovido
a `admin` depois de aprovado, ambos reusando o código do próprio ambiente, continuam `admin` (ver
passo 15 do script de QA, `scripts/qa-convite-por-codigo.ts`).

## Achado durante QA (não previsto no plano): `members`/`pendingMembers` não podiam lançar erro

O plano pedia que os field resolvers `members`/`pendingMembers` em `EnvironmentModel` chamassem
`assertEnvironmentAccess`/`assertEnvironmentAdmin` (que lançam `GraphQLError`) antes de devolver
qualquer coisa, pra fechar o vazamento de PII via `getEnvironmentByInviteCode`. Isso funciona bem
para esse caso (preview de quem ainda não é membro), mas **quebra `listMyEnvironments` para o
próprio usuário quando um dos ambientes retornados é um onde ele está `pending`**: GraphQL
propaga o erro de um campo não-nulo (`members: [EnvironmentMemberModel!]!`) pro item da lista mais
próximo, e como `listMyEnvironments` também é `[EnvironmentModel!]!` (lista não-nula de itens não-
nulos), um erro ao resolver `members` de **qualquer um** dos ambientes anula a resposta inteira —
inclusive os outros ambientes onde o usuário tem acesso normal. Isso contradiz diretamente o
próprio requisito do plano: "[`pending`] Aparece em `listMyEnvironments` para o próprio usuário
(precisa saber que está aguardando aprovação)".

Descoberto rodando o script de QA (`scripts/qa-convite-por-codigo.ts`, passo 7) com a query
`listMyEnvironments { ... members { ... } } }` — o mesmo padrão de query que o script de QA da
tarefa 01 já usava, ou seja, qualquer client real que peça `members` ao listar os próprios
ambientes bateria nisso.

**Correção**: `members`/`pendingMembers` em `EnvironmentModel` passam a ser `nullable: true` no
GraphQL, e os field resolvers devolvem `null` (em vez de lançar) quando quem pediu não tem o
acesso necessário — `null` nunca vaza PII (mesma garantia de segurança do plano original) e, por
ser um campo nulável, o erro não propaga pro resto da lista. Dois helpers booleanos novos em
`environment-access.ts` (`hasEnvironmentAccess`/`isEnvironmentAdmin`, que envolvem os `assert*`
existentes em `try/catch` e nunca lançam) sustentam essa checagem sem duplicar a lógica de acesso.

## Validação

- `npx prisma generate` e `npx tsc --noEmit --skipLibCheck` sem erros.
- `npx prisma migrate deploy` aplicado com sucesso contra o Postgres de desenvolvimento (Neon).
- QA manual completo contra o servidor GraphQL real e o banco real — ver
  [02-QA-BACK-convite-por-codigo](../../docs/qa/02-QA-BACK-convite-por-codigo.md) (62/62
  verificações, 1 bug real encontrado e corrigido — documentado acima e no próprio relatório de
  QA). Banco de desenvolvimento confirmado limpo ao final (0 usuários/ambientes de QA restantes,
  incluindo lixo acumulado de rodadas anteriores da tarefa 01).

## Atualização pós-revisão do plano de frontend (2026-10-19)

Ao revisar o plano irmão de frontend, ficou evidente uma contradição que o backend, do jeito que
foi implementado, não resolvia: a UI de "pending" (badge, estado de espera) precisa saber o
próprio `role` do usuário em cada ambiente, mas a fonte óbvia pra isso seria `members` — exatamente
o campo que `hasEnvironmentAccess` faz retornar `null` pra quem está `pending`, de propósito. Ou
seja, quem está pendente nunca conseguiria descobrir que está pendente, porque o único lugar onde
isso apareceria é escondido dela mesma.

Corrigido com um campo novo, `EnvironmentModel.myMembership`: resolve só a própria linha de quem
pediu (nunca a de outra pessoa), sem checagem de acesso — revelar o próprio `role` de alguém nunca
é vazamento de PII, ao contrário de `members`/`pendingMembers`. `null` significa "não é membro
nenhum deste ambiente" (ex.: preview via `getEnvironmentByInviteCode`, antes de entrar).
Adição puramente aditiva — `npx tsc --noEmit` e a suíte de QA (62/62) confirmados sem regressão
depois da mudança.

## Pendências / próximos passos

- Frontend (plano irmão [02-FRONTEND-convite-por-codigo](../../docs/plans/02-FRONTEND-convite-por-codigo.md))
  ainda não implementado — fora do escopo desta etapa.
- Rate limiting de tentativas de código, adiado a pedido explícito do solicitante — ver seção
  "Riscos" do plano aprovado.
- Com `members`/`pendingMembers` agora nuláveis, o frontend precisa tratar `null` como "sem acesso
  a essa lista neste ambiente" (ex.: ambiente `pending` na própria `listMyEnvironments`), não como
  erro — relevante pro plano de frontend irmão. Pra saber o próprio `role` (inclusive quando
  `pending`), o frontend deve usar `myMembership.role`, não procurar dentro de `members` (ver
  "Atualização pós-revisão" abaixo).
