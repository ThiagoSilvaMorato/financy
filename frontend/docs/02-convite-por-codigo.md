# Convite por código (substitui convite por e-mail)

**Data:** 2026-10-19
**Plano:** [02-FRONTEND-convite-por-codigo](../../docs/plans/02-FRONTEND-convite-por-codigo.md)

## O que foi feito

- **`shared/models/environment.ts`**: `EnvironmentInviteModel` removido; novo
  `EnvironmentInviteCodeModel` (`environmentId`, `code`, `expiresAt`, `createdAt`).
  `EnvironmentMemberModel.role` passa a admitir `"pending"`. `EnvironmentModel.members` vira
  `EnvironmentMemberModel[] | null` (antes, obrigatório); novos campos `pendingMembers:
  EnvironmentMemberModel[] | null` e `myMembership: EnvironmentMemberModel | null`.
- **`utils/getMyEnvironmentMember.ts`** removido. O padrão `members.find(m => m.user?.id ===
  currentUserId)` que ele encapsulava parava de funcionar pra quem está `pending` (`members` vem
  `null` de propósito pra esse caso) — substituído, nos três lugares que o usavam, por leitura
  direta de `environment.myMembership` (`EnvironmentManagement`, `EnvironmentListItem`,
  `TransactionFormModal`).
- **`lib/graphql/queries/Environment.ts`**: `LIST_MY_ENVIRONMENTS` passa a pedir `pendingMembers`
  e `myMembership { id role }` em cada ambiente. Novas queries `GET_CURRENT_INVITE_CODE` e
  `GET_ENVIRONMENT_BY_INVITE_CODE`. `LIST_MY_PENDING_INVITES`/`LIST_ENVIRONMENT_INVITES`
  removidas.
- **`lib/graphql/mutation/Environment.ts`**: novas `GENERATE_ENVIRONMENT_INVITE_CODE`,
  `JOIN_ENVIRONMENT_BY_CODE`, `APPROVE_MEMBER`. Removidas `INVITE_MEMBER`,
  `CANCEL_ENVIRONMENT_INVITE`, `ACCEPT_ENVIRONMENT_INVITE`, `DECLINE_ENVIRONMENT_INVITE`.
- **`stores/environment`**: novo seletor `useCurrentEnvironmentRole()` — devolve
  `myMembership?.role` do ambiente ativo globalmente, lendo o que `listMyEnvironments` já carregou
  (sem query adicional).
- **`components/PendingEnvironmentNotice/`** (nova): mensagem compartilhada "Aguardando
  aprovação" / "Sua entrada neste ambiente está aguardando aprovação de um administrador.", usada
  por `Dashboard`, `Transactions`, `Category` (via `useCurrentEnvironmentRole()`, ambiente ativo) e
  `EnvironmentManagement` (via `environment.myMembership?.role` do ambiente resolvido pelo `:id`
  da rota, que pode ser diferente do ativo). Em todos os quatro, a checagem acontece antes de
  disparar as queries normais de dado (categoria/transação) — pending nunca chega a tentar buscar
  dado que não teria acesso de qualquer forma.
- **`components/EnvironmentSwitcher/`** e **`EnvironmentListItem`**: badge "Aguardando aprovação"
  (em vez de Admin/Membro) quando `environment.myMembership?.role === "pending"`. Em nenhum dos
  dois lugares isso bloqueia navegação/seleção — são só indicadores visuais.
- **`pages/EnvironmentManagement`**:
  - `isAdmin`/`currentMemberId` passam a vir de `environment.myMembership` (antes,
    `getMyEnvironmentMember` + `environment.members.find(...)`, que lançaria `TypeError` com
    `members` nulo).
  - Novo componente `InviteCodeCard` (substitui `InviteMemberForm` + `SentInvites`): busca
    `getCurrentInviteCode` ao montar (nunca gera um código só pra exibir), mostra código ativo +
    validade + "Copiar código" (`navigator.clipboard`, toast de erro em caso de falha) + "Gerar
    novo código" (com um `Dialog` de confirmação explícita, já que invalida o anterior); sem código
    ativo, mostra só "Gerar código de convite" (sem confirmação, não há nada pra invalidar).
  - Novo componente `PendingMembersList` (Admin only, oculto se vazio): lista
    `environment.pendingMembers`, ações "Aprovar" (`approveMember`) e "Remover" (reaproveita
    `removeMember`, já existente).
  - `InviteMemberForm`, `SentInvites` removidos.
- **`pages/Profile/components/EnvironmentsTab`**:
  - Novo botão "Entrar com código" ao lado de "Criar ambiente conjunto", abrindo o novo
    `JoinByCodeModal`: passo 1 (`CustomInput` do código → `getEnvironmentByInviteCode`) → passo 2
    (confirmação "Deseja entrar no ambiente **{nome}**?" → `joinEnvironmentByCode` →
    `refreshEnvironments()`, sem `switchEnvironment` — o ambiente entra como `pending`, sem nada
    pra ver ainda).
  - `PendingInvites` removido (convites pendentes por e-mail deixaram de existir; o estado
    `pending` por código já aparece na própria listagem via badge, não precisa de uma seção
    separada).
- **`lib/graphql/apollo.ts`**: `errorLink` passa a reconhecer também a mensagem exata "Seu acesso a
  este ambiente ainda não foi aprovado por um administrador.", disparando o mesmo fallback
  (`refreshEnvironments()`) já usado para "Você não tem acesso a este ambiente." — rede de
  segurança, não o mecanismo principal (a UI trata `pending` proativamente via `myMembership`
  antes de qualquer query normal ser disparada).
- **`pages/EnvironmentManagement/models`**: `InviteMemberForm` (tipo) removido.

## Por que foi feito

Implementa a ponta de frontend da task 02 (convite por código reutilizável, substituindo o convite
por e-mail da task 01), cujo backend já estava pronto, testado (62 verificações) e documentado,
mas não commitado. Sem essa ponta, a API nova não tinha como ser usada: não existia lugar na UI
para gerar/copiar o código, entrar com ele, ou o Admin ver/aprovar quem entrou.

## Por que esse caminho foi escolhido

- **`myMembership` como única fonte do próprio papel, nunca `members.find(...)`**: ponto mais
  importante do plano aprovado (contradição real encontrada numa rodada de revisão posterior à
  implementação do backend). `members` vem `null` por design para quem está `pending` — o padrão
  antigo (`utils/getMyEnvironmentMember.ts`) nunca encontraria a própria linha nesse caso, e pior,
  em `EnvironmentManagement` isso vira `TypeError` em runtime assim que `members` é `null` (array
  `undefined.find(...)`). `myMembership` é sempre acessível a quem já é membro de qualquer `role`,
  então elimina os dois problemas de uma vez.
- **Checagem de `pending` proativa a partir de `myMembership`, não reativa a um erro do backend**:
  decisão explícita do plano — nunca deixar o usuário descobrir que está pendente só por um erro
  cru da API. O `errorLink` em `apollo.ts` ainda reconhece a mensagem de "acesso ainda não
  aprovado", mas só como rede de segurança (ex.: condição de corrida, bug futuro), não como
  mecanismo principal.
- **Nunca bloquear navegação por `role`, sempre a página de destino decidir o que mostrar**: um
  único mecanismo (`useCurrentEnvironmentRole()` + `<PendingEnvironmentNotice />`) reaproveitado em
  `Dashboard`/`Transactions`/`Category`, em vez de duplicar lógica de bloqueio no seletor e no botão
  "Gerenciar". `EnvironmentManagement` reusa o mesmo componente de notice, mas lendo o `role` do
  ambiente da própria rota (`:id`), não do ambiente ativo globalmente — são conceitos diferentes
  (alguém pode ser Admin no ambiente ativo e `pending` em outro que tentou gerenciar por engano).
- **`getCurrentInviteCode` ao montar `InviteCodeCard`, nunca `generateEnvironmentInviteCode`
  automaticamente**: gerar de novo invalida o código anterior; sem essa query de leitura, reabrir a
  tela de gerenciamento não teria como mostrar o código já compartilhado sem o risco de invalidá-lo
  sem querer.
- **Confirmação só no "gerar novo código" (código já ativo), não no primeiro "gerar código de
  convite"**: só a primeira ação é destrutiva (invalida um código que pode já estar em uso); gerar
  o primeiro código de um ambiente que nunca teve um não tem nada a perder.
- **Dialog na própria aba Ambientes para "Entrar com código", não uma rota dedicada**: mesmo padrão
  já usado por "Criar ambiente conjunto" no mesmo lugar — decisão já registrada no plano aprovado.
- **`utils/getMyEnvironmentMember.ts` removido em vez de só simplificado**: com `myMembership` já
  pronto para uso direto (`environment.myMembership?.role`/`?.id`), o wrapper vira uma função de
  uma linha sem ganho real sobre acessar o campo diretamente nos três call sites — manter o arquivo
  só adicionaria uma indireção sem propósito.

## Validação

- `npm run build` (type-check + build) e `npm run lint`: sem erros introduzidos (o único erro de
  lint restante, em `components/ui/button.tsx`, já existia antes desta tarefa e não foi tocado).
- QA manual na interface (browser real, contra o backend local + banco de dev): ver
  [02-QA-FRONT-convite-por-codigo](../../docs/qa/02-QA-FRONT-convite-por-codigo.md) para o
  passo a passo completo, incluindo um ponto da jornada (o diálogo "Entrar com código") que não pôde
  ser clicado através da ferramenta de automação disponível (instabilidade da ferramenta, não um
  bug da aplicação) e foi validado por uma via alternativa equivalente.

## Pendências / follow-ups

- **`EnvironmentManagement`: `canDelete`/`canLeave`/"último Admin" continuam calculados só a partir
  de `activeRealMembers` (derivado de `members`, que já exclui `pending` na fonte, pelo backend)**,
  sem somar `pendingMembers` a essas contas. Isso pode deixar o botão "Excluir ambiente" habilitado
  no cliente num caso em que o backend corretamente recusa (ambiente com 1 Admin + 1 `pending`, que
  o backend conta como "membro real ativo" para efeito de bloqueio de exclusão) — o erro aparece
  via toast (`try/catch` já existente), não é um estado quebrado, mas a UI não antecipa esse caso
  como faz para os demais. Não estava no escopo listado no plano aprovado (que só pedia a troca de
  `isAdmin`/`currentMemberId` para `myMembership`); registrado aqui para uma correção futura se o
  caso se mostrar incômodo na prática.
- Rate limiting de tentativas de código: adiado no plano de backend, nenhuma UI correspondente
  necessária nesta tarefa.
