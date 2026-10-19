# 02 - FRONTEND - Convite por código (substitui convite por e-mail)

**Status:** Concluído — ver [registro de implementação](../../frontend/docs/02-convite-por-codigo.md)
e [QA](../qa/02-QA-FRONT-convite-por-codigo.md)
**Data:** 2026-10-19
**Plano irmão:** [02-BACKEND-convite-por-codigo](./02-BACKEND-convite-por-codigo.md)
**Depende de:** [01-FRONTEND-ambientes-compartilhados](./01-FRONTEND-ambientes-compartilhados.md) (já concluído)

## Objetivo

Substituir a UI de convite por e-mail por: (lado do Admin) geração/exibição do código de convite
do ambiente e aprovação de quem entrou; (lado de quem recebe o código) uma tela para digitar o
código, com confirmação mostrando o nome do ambiente antes de entrar, e um estado claro de
"aguardando aprovação" enquanto não for aprovado por um Admin.

## Abordagem proposta

### Remoções

- `pages/EnvironmentManagement/components/InviteMemberForm/` — removido.
- `pages/EnvironmentManagement/components/SentInvites/` — removido.
- `pages/Profile/components/EnvironmentsTab/components/PendingInvites/` — removido (não confundir
  com a nova seção de *membros* pendentes de aprovação, que é outra coisa).
- GraphQL: remove `INVITE_MEMBER`, `LIST_MY_PENDING_INVITES`, `LIST_ENVIRONMENT_INVITES`,
  `ACCEPT_ENVIRONMENT_INVITE`, `DECLINE_ENVIRONMENT_INVITE`, `CANCEL_ENVIRONMENT_INVITE`.
- `shared/models/environment.ts` — remove `EnvironmentInviteModel`.

### Geração do código (tela de gerenciamento)

- Novo componente `pages/EnvironmentManagement/components/InviteCodeCard/` substitui
  `InviteMemberForm` + `SentInvites` na mesma posição. Admin only; oculto no ambiente pessoal.
- Ao abrir a tela, busca o estado atual via `getCurrentInviteCode` (query nova no backend — ver
  plano de backend) — **nunca** chama `generateEnvironmentInviteCode` automaticamente só para
  exibir algo. Sem essa consulta de leitura, reabrir a tela de gerenciamento não teria como
  mostrar o código já compartilhado sem acidentalmente invalidá-lo gerando um novo.
- Código ativo (retornado e não expirado): mostra o código, data de expiração, botão "Copiar
  código" (`navigator.clipboard.writeText`, fallback de toast se indisponível) e "Gerar novo
  código" (com confirmação explícita — "isso vai invalidar o código atual").
- Sem código ativo (`getCurrentInviteCode` retornou `null`, ou retornou um código já expirado):
  mostra só o botão "Gerar código de convite".

### Entrada por código (aba Ambientes do Profile)

- Botão **"Entrar com código"** ao lado de "Criar ambiente conjunto" em `EnvironmentsTab`, mesmo
  padrão de `Dialog`.
- Fluxo: `CustomInput` do código → `getEnvironmentByInviteCode` → inválido/expirado: toast de
  erro, dialog continua aberto; válido: modal de confirmação "Deseja entrar no ambiente **{nome}**?"
  → confirma → `joinEnvironmentByCode` → `refreshEnvironments()` (o ambiente aparece na lista como
  `pending` — ver abaixo; **não** chama `switchEnvironment` para ele, porque não há nada pra ver
  ali ainda).
- Erro na confirmação (código expirou/mudou entre o preview e a confirmação): toast, sem estado
  intermediário inconsistente.

### Permissão `pending` — como aparece na UI

Essa é a parte nova em relação à primeira versão deste plano, decorrente da 3ª permissão criada no
backend (ver plano de backend). Um ambiente em que o próprio usuário logado está `pending` precisa
ficar **visivelmente diferente** de um ambiente normal, em todo lugar que lista ambientes:

Decisão definitiva (sem alternativas em aberto): **nunca impedir navegação por role, sempre deixar
a página de destino decidir o que mostrar** — é um único mecanismo reaproveitado em todo lugar, em
vez de duplicar a lógica de bloqueio no botão "Gerenciar" E no seletor E em cada página.

**Achado crítico desta rodada de revisão — de onde vem o próprio `role`**: a primeira versão
desta seção assumia que o `role` do usuário em cada ambiente viria de dentro de `members` (olhando
qual item tem `user.id === currentUserId`). Isso não funciona: `members` é exatamente o campo que
o backend devolve `null` para quem está `pending` (correção de segurança da tarefa 02 — ver plano
de backend), então a própria pessoa pendente nunca veria seu próprio `role` ali. O backend ganhou
um campo dedicado pra isso, `EnvironmentModel.myMembership` — a própria membership de quem pediu,
sem a restrição de acesso que `members`/`pendingMembers` têm (revelar o próprio `role` de alguém
nunca é vazamento de PII, diferente de revelar o de terceiros). Toda a UI abaixo lê
`environment.myMembership?.role`, nunca procura dentro de `members`.

- **`EnvironmentsTab`** (lista de ambientes do usuário): item do ambiente mostra um badge
  "Aguardando aprovação" quando `myMembership?.role === "pending"`, no lugar do badge de papel
  normal (Admin/User). O botão "Gerenciar" continua clicável normalmente — a tela de gerenciamento
  é quem decide o que mostrar (ver próximo ponto), não a listagem.
- **`EnvironmentSwitcher`** (popover do avatar): mesma fonte (`myMembership?.role`) pro badge;
  ambientes `pending` **são selecionáveis normalmente** — trocar para um ambiente pendente é
  permitido; a página em que o usuário cair (Dashboard, Transações, Categorias) é quem mostra o
  estado de espera, pelo mesmo mecanismo do próximo ponto.
- **Mecanismo único de "estado de espera" para páginas que dependem de dados do ambiente**: criar
  um hook pequeno e compartilhado (ex.: `useCurrentEnvironmentRole()` em `stores/environment`) que
  devolve `environments.find(e => e.id === currentEnvironmentId)?.myMembership?.role` — sem query
  nova, só lendo o que `listMyEnvironments` já trouxe. `Dashboard`, `Transações` e `Categorias`
  usam esse hook: se o resultado for `"pending"`, renderizam um componente compartilhado (ex.:
  `<PendingEnvironmentNotice />`) com a mensagem "Sua entrada neste ambiente está aguardando
  aprovação de um administrador." em vez de disparar as queries normais de categoria/transação.
- **`EnvironmentManagement` é um caso diferente**: a rota é `/environments/:id`, então o ambiente
  relevante não é necessariamente o `currentEnvironmentId` ativo — é o ambiente resolvido pelo
  `:id` da própria URL (mesmo padrão já usado na tarefa 01, buscando por id dentro da lista já
  carregada). A checagem de `pending` usa `esseAmbiente.myMembership?.role`, não o do ambiente
  ativo globalmente — alguém pode ser Admin no ambiente ativo e `pending` em outro que tentou
  gerenciar por engano (ex.: um link antigo). Se `pending`, mostra o mesmo
  `<PendingEnvironmentNotice />` em vez das seções de membros/participantes/código.
- Em todos os casos acima, o objetivo é o mesmo: nunca deixar o usuário descobrir que está
  pendente só através de um erro cru da API — o dado de `role` já chega antes, pela própria lista
  de ambientes (via `myMembership`), e a UI decide a partir dele.
- **Rede de segurança, não o mecanismo principal**: ainda assim, `errorLink` em `apollo.ts`
  (tarefa 01) deve passar a reconhecer também a nova mensagem exata do backend "Seu acesso a este
  ambiente ainda não foi aprovado por um administrador." (ver plano de backend) e disparar o
  mesmo fallback — `refreshEnvironments()` + volta pro ambiente pessoal — que já dispara pra
  "Você não tem acesso a este ambiente.". Isso cobre o caso de a checagem proativa acima falhar
  por algum motivo (bug, condição de corrida) e uma query de Transação/Categoria ser disparada
  mesmo assim: melhor cair de volta pro ambiente pessoal do que deixar o usuário numa tela
  quebrada com um erro crú na tela.

### Aprovação de membros pendentes (tela de gerenciamento, Admin only)

- Nova seção **"Pendentes de aprovação"** em `EnvironmentManagement`, separada da lista normal de
  membros (que, pelo próprio backend, nunca inclui quem está `pending` — ver
  `pendingMembers`/`members` no plano de backend). Só visível pra Admin (a query
  `pendingMembers` já é Admin only no backend).
- Cada item: nome/e-mail da pessoa, data em que entrou, ações **"Aprovar"** (`approveMember`) e
  **"Remover"** (reaproveita a mutation `removeMember` já existente — nenhuma mutation nova
  necessária pra "rejeitar", é a mesma remoção que já existe pra qualquer membro).

### Seletor "de quem é essa transação"

- O select de `memberId` em `TransactionFormModal` já é populado a partir de `members` do
  ambiente ativo — como o backend agora filtra `pending` para fora desse campo na fonte (ver plano
  de backend), a lista de opções continua sem pendentes, sem mudança necessária aí.
- O valor **padrão** ("eu mesmo"), que na tarefa 01 era derivado procurando em `members` o item com
  `user?.id === currentUserId` (`utils/getMyEnvironmentMember.ts`), passa a usar
  `environment.myMembership.id` diretamente — mais simples, e deixa de depender de `members` (que
  agora pode ser `null`) só para encontrar a própria linha. `getMyEnvironmentMember.ts` é
  simplificado/substituído por essa leitura direta.

## Arquivos/áreas afetadas

- `pages/EnvironmentManagement/components/InviteCodeCard/` — nova (substitui `InviteMemberForm` +
  `SentInvites`).
- `pages/EnvironmentManagement/components/PendingMembersList/` — nova (Aprovar/Remover).
- `pages/EnvironmentManagement/components/MembersList/` — sem mudança funcional (já não recebe
  pendentes, pois a fonte dos dados já vem filtrada).
- `pages/Profile/components/EnvironmentsTab/components/JoinByCodeModal/` — nova.
- `pages/Profile/components/EnvironmentsTab/components/EnvironmentListItem/` — badge "Aguardando
  aprovação" quando `environment.myMembership?.role === "pending"`.
- `components/EnvironmentSwitcher/` — mesmo badge "Aguardando aprovação"; item permanece
  selecionável normalmente (ver "Permissão `pending`" acima — a página de destino decide o que
  mostrar, o seletor não bloqueia nada).
- `stores/environment/` — novo hook/seletor `useCurrentEnvironmentRole()` (ou equivalente), lendo
  `myMembership?.role` do ambiente ativo a partir dos dados já carregados, sem query nova.
- `components/PendingEnvironmentNotice/` — novo componente compartilhado, usado por
  `Dashboard`/`Transactions`/`Category`/`EnvironmentManagement`.
- `pages/Dashboard/index.tsx`, `pages/Transactions/index.tsx`, `pages/Category/index.tsx` —
  checagem de `role === "pending"` no ambiente ativo antes de disparar as queries normais;
  renderiza `<PendingEnvironmentNotice />` se for o caso.
- `pages/EnvironmentManagement/index.tsx` — mesma checagem, mas usando o `role` do usuário no
  ambiente resolvido pelo `:id` da rota (não necessariamente o ambiente ativo globalmente — ver
  "Permissão `pending`" acima). Além disso: hoje `isAdmin`/`canDelete` (e o que é passado como
  `isAdmin` pros componentes filhos) vêm de `getMyEnvironmentMember(environment, userId)`, que faz
  `environment.members.find(...)` — com `members` agora podendo ser `null`, isso **quebra com
  `TypeError`**, não só "não encontra nada", se por algum motivo a página for renderizada antes da
  checagem de `pending` acima surtir efeito. Troca pra `environment.myMembership?.role === "admin"`
  elimina esse risco (nunca lança, porque `myMembership` é sempre acessível a quem já é membro de
  qualquer `role`, inclusive pending) e também simplifica o código.
- `lib/graphql/apollo.ts` — `errorLink` passa a reconhecer também a mensagem de erro do ambiente
  `pending` (ver "Permissão `pending`" acima), além da mensagem genérica de "sem acesso" já
  tratada na tarefa 01.
- `lib/graphql/mutation/Environment.ts` / `lib/graphql/queries/Environment.ts` — remove as
  operações de convite por e-mail; adiciona `GENERATE_ENVIRONMENT_INVITE_CODE`,
  `GET_CURRENT_INVITE_CODE`, `GET_ENVIRONMENT_BY_INVITE_CODE`, `JOIN_ENVIRONMENT_BY_CODE`,
  `APPROVE_MEMBER`, e o campo `pendingMembers` na query de ambiente usada pela tela de
  gerenciamento.
- `shared/models/environment.ts` — remove `EnvironmentInviteModel`, adiciona
  `EnvironmentInviteCodeModel`; `EnvironmentMemberModel.role` passa a admitir `"pending"` no tipo
  (hoje provavelmente tipado como `"admin" | "user" | null` — vira `"admin" | "user" | "pending" |
  null`). `EnvironmentModel` ganha três campos novos, todos genuinamente nuláveis no tipo (não só
  opcionais — o backend devolve `null` de propósito, não omite o campo):
  `members?: EnvironmentMemberModel[] | null` (já existia como obrigatório antes — agora é
  nulável), `pendingMembers?: EnvironmentMemberModel[] | null`,
  `myMembership?: EnvironmentMemberModel | null` (a própria membership de quem pediu — ver
  "Permissão `pending`" acima).
- `utils/getMyEnvironmentMember.ts` — simplificado para ler `environment.myMembership` diretamente
  em vez de procurar dentro de `members` (que agora pode ser `null`).
- `pages/EnvironmentManagement/services/index.ts`,
  `pages/Profile/components/EnvironmentsTab/services/index.ts` — atualizar.
- `lib/graphql/queries/Environment.ts` — `LIST_MY_ENVIRONMENTS` passa a pedir
  `myMembership { id role }` em cada ambiente (necessário pra tudo que depende de saber o próprio
  `role`, incluindo quando `pending`).

## Riscos e alternativas consideradas

- **Preview pode ficar obsoleto entre a digitação e a confirmação**: o backend sempre revalida em
  `joinEnvironmentByCode`, então o pior caso é um toast de erro na confirmação — tratado, não é um
  estado inconsistente.
- **Clipboard API pode não estar disponível**: fallback de toast de erro, código continua visível
  pra copiar manualmente.
- **Alternativa descartada: tela/rota dedicada para entrar com código.** Optado por um `Dialog` na
  aba Ambientes em vez de uma rota nova, consistente com "Criar ambiente conjunto" no mesmo lugar.
- **Risco de UX se o estado `pending` for tratado só como erro genérico**: decidido tratar
  proativamente a partir do `role` já carregado (ver seção acima), em vez de deixar o usuário
  descobrir via uma mensagem de erro ao tentar abrir a tela — menos confuso, e evita confundir com
  o fallback de `FORBIDDEN` já existente da tarefa 01, que serve a um propósito diferente (ambiente
  que ficou inacessível depois de já ter acesso, não "ainda não aprovado").
- **Rate limiting de tentativas de código**: fora de escopo deste plano (ver plano de backend) —
  nenhuma UI de "aguarde N minutos" nesta tarefa.
- **Contradição encontrada nesta rodada**: a primeira versão deste plano assumia que o `role` do
  usuário em cada ambiente seria derivado de dentro de `members` — mas esse é exatamente o campo
  que o backend esconde (`null`) de quem está `pending`, pela correção de segurança da própria
  tarefa 02. Sem o campo `myMembership` (adicionado ao backend depois dessa revisão), a pessoa
  pendente nunca teria como descobrir que está pendente — o mecanismo inteiro de badge/estado de
  espera dependia de um dado que não existia pra ela. Corrigido usando `myMembership` em todo
  lugar que precisa do próprio `role`, nunca `members`.
