# Ambientes compartilhados (contas conjuntas)

**Data:** 2026-10-11
**Plano:** [01-FRONTEND-ambientes-compartilhados](../../docs/plans/01-FRONTEND-ambientes-compartilhados.md)

## O que foi feito

- **Novo store `stores/environment`**: `currentEnvironmentId`, `environments: EnvironmentModel[]`,
  `switchEnvironment(id)` (troca só de sessão, não chama `setDefaultEnvironment`) e
  `refreshEnvironments()` (busca `listMyEnvironments` e, se `currentEnvironmentId` não estiver mais
  entre os ambientes retornados — removido, excluído, ou perda de acesso em outra aba —, cai
  automaticamente para o ambiente pessoal). Persistido via `persist`, como `stores/auth`.
- **`lib/graphql/queries/Environment.ts` e `lib/graphql/mutation/Environment.ts`**: todas as
  queries/mutations novas do backend (`listMyEnvironments`, `listMyPendingInvites`,
  `listEnvironmentInvites`, `createEnvironment`, `inviteMember`, `cancelEnvironmentInvite`,
  `acceptEnvironmentInvite`, `declineEnvironmentInvite`, `promoteToAdmin`, `removeMember`,
  `leaveEnvironment`, `deleteEnvironment`, `createParticipant`, `removeParticipant`,
  `renameEnvironment`, `setDefaultEnvironment`), com os nomes exatos de `backend/schema.graphql`.
- **`shared/models/environment.ts`**: `EnvironmentModel`, `EnvironmentMemberModel`,
  `EnvironmentInviteModel`.
- **`pages/Profile`**: convertida para `Tabs` (Radix) — "Perfil" (conteúdo inalterado) e
  "Ambientes" (`components/EnvironmentsTab`, nova): lista de ambientes do usuário com badge
  "Pessoal"/papel, botão "Gerenciar", modal "Criar ambiente conjunto" e seção "Convites
  pendentes" (aceitar/recusar).
- **`pages/EnvironmentManagement`** (nova, rota `/environments/:id`, só acessível pelo botão
  "Gerenciar"): membros reais ativos (promover/remover, Admin only), participantes
  (criar/remover, Admin only), formulário de convite por e-mail + papel (Admin only, oculto no
  ambiente pessoal), "Convites enviados" (cancelar, Admin only), renomear (Admin only), "Definir
  como ambiente padrão no login" (`setDefaultEnvironment`, qualquer membro), sair do ambiente
  (com modal de escolha de novo Admin quando o usuário é o último Admin com outros membros
  restantes) e excluir ambiente (Admin only, habilitado só com exatamente 1 membro real ativo e
  nunca no ambiente pessoal).
- **`components/EnvironmentSwitcher`**: popover ao lado do avatar no `Header`, sempre visível,
  lista os ambientes do usuário e troca o ambiente ativo via `switchEnvironment`.
- **Transações e categorias**: `environmentId` do ambiente ativo passou a ser enviado
  implicitamente pelos services (`pages/Transactions/services`, `pages/Category/services`,
  `utils/fetchData/*`) — nunca um campo do formulário. `TransactionFormModal` ganhou o campo
  "De quem é essa transação" (`memberId`), com as opções (membros reais + participantes ativos) e
  o valor padrão ("eu mesmo") derivados da lista de membros do ambiente ativo já carregada em
  `stores/environment` (sem query adicional).
- **`lib/graphql/apollo.ts`**: `errorLink` passou a reconhecer a mensagem exata que o backend usa
  para erro de acesso a ambiente (`"Você não tem acesso a este ambiente."`, `extensions.code:
  "FORBIDDEN"`) e, ao vê-la, chama `refreshEnvironments()` em segundo plano — sem retry automático
  da operação que falhou; as telas que dependem de `currentEnvironmentId` refazem a busca sozinhas
  quando ele muda, pelo próprio `useEffect` já existente.
- **`stores/auth`**: `logout` agora também limpa `stores/environment` (estado e localStorage);
  `login`/`signup` chamam `refreshEnvironments()` ao autenticar. `App.tsx` chama
  `refreshEnvironments()` sempre que `isAuthenticated` passa a `true` (cobre sessão restaurada do
  localStorage ao recarregar a página).
- **`types/index.ts`**: removido o campo especulativo `User.role` (nunca preenchido pelo backend —
  `UserModel` nem expõe esse campo). O papel do usuário agora só existe por ambiente, em
  `EnvironmentMemberModel.role`, que é onde ele realmente pertence.
- Novos primitivos de UI: `components/ui/tabs.tsx` (Radix `Tabs`, dependência
  `@radix-ui/react-tabs` adicionada) e `components/ui/badge.tsx` (CVA, sem dependência Radix).

## Por que foi feito

A tarefa implementa a ponta de frontend da feature de ambientes compartilhados (contas conjuntas)
cujo backend já estava pronto, testado e commitado (plano irmão
[01-BACKEND-ambientes-compartilhados](../../docs/plans/01-BACKEND-ambientes-compartilhados.md)).
Sem essa ponta, a API não tinha como ser usada: não existia lugar na UI para criar/gerenciar um
ambiente conjunto, trocar de ambiente, ou atribuir uma transação a um membro/participante — e,
sem a aba "Convites pendentes" em Profile, o convidado não teria como aceitar um convite (o e-mail
avisa, mas aceitar exige sessão autenticada no app).

## Por que esse caminho foi escolhido

- **`environmentId` implícito, nunca no formulário**: decisão explícita do plano aprovado — a
  camada de serviço de cada página (`pages/X/services`) já encapsula a query/mutation, então
  injetar `environmentId` ali (lendo `useEnvironmentStore.getState().currentEnvironmentId`) mantém
  o padrão existente sem introduzir lógica escondida num Apollo Link adicional.
- **Fallback de ambiente inacessível via `errorLink` + re-fetch por dependência, não por retry
  automático da operação**: testado contra o backend real (ver QA manual descrito abaixo) — o
  erro de acesso perdido usa sempre a mesma mensagem exata
  (`"Você não tem acesso a este ambiente."`, `extensions.code: "FORBIDDEN"`), diferente do erro de
  "apenas administradores" (mensagem diferente, mesmo `code`). Casar pela mensagem exata (mesmo
  padrão já usado no arquivo para `"Unauthenticated"`) evita que uma ação bloqueada por falta de
  papel de Admin dispare incorretamente a queda para o ambiente pessoal. Re-executar a query
  trocando `currentEnvironmentId` e deixando os `useEffect` existentes reagirem é mais simples que
  reescrever a variável da operação falha e repetir a chamada dentro do link.
- **Guarda de "último Admin" calculada no cliente antes de chamar `leaveEnvironment`, em vez de
  reagir ao erro do backend**: os dados já disponíveis (`EnvironmentMemberModel[]` do ambiente
  ativo) permitem calcular deterministicamente se o usuário é o último Admin com outros membros
  restantes, abrindo a modal de escolha de novo Admin só quando necessário. Isso evita acoplar a UI
  a uma string de erro de regra de negócio (motivo diferente do erro de acesso, que precisa mesmo
  de string matching por não ter `extensions.code` próprio) e dá feedback imediato. A chamada à
  mutation continua protegida por `try/catch` como rede de segurança.
- **`EnvironmentManagement` lê o ambiente da lista já carregada em `stores/environment`, não de
  uma query dedicada**: o schema não expõe um `getEnvironmentById` — só `listMyEnvironments`,
  `listMyPendingInvites` e `listEnvironmentInvites`. Buscar por id dentro da lista evita uma query
  nova só para repetir dados já disponíveis.
- **"Convites enviados" agora exibe o convidado, não quem convidou**: identificado como gap pela
  implementação original — `EnvironmentInviteModel` só expunha `invitedBy` (quem convidou), sem
  equivalente para quem foi convidado, então a lista mostrava a informação errada pra esse
  contexto (o Admin vendo a própria lista de convites enviados já sabe que foi ele quem convidou;
  o que falta saber é quem está do outro lado). Corrigido em par com o backend
  ([01-ambientes-compartilhados](../../backend/docs/01-ambientes-compartilhados.md)): novo campo
  `invitedUser` em `EnvironmentInviteModel`/`EnvironmentInviteResolver`, consumido em
  `LIST_ENVIRONMENT_INVITES` e exibido em `SentInvites`.
- **`User.role` removido em favor de `EnvironmentMemberModel.role`**: o plano deixou essa decisão
  explicitamente para a implementação. `UserModel` no schema real nunca teve esse campo (as
  mutations de login/registro no frontend nunca o solicitavam), e papel é uma propriedade por
  ambiente, não do usuário globalmente — mantê-lo seria reintroduzir um campo morto.
- **Sem agrupamento/filtro de relatórios por `memberId`**: fora de escopo deste plano, conforme já
  registrado nos riscos do plano aprovado.

## Validação

- `npm run build` (type-check + build) e `npm run lint`: sem erros introduzidos (o único erro de
  lint restante, em `components/ui/button.tsx`, já existia antes desta tarefa e não foi tocado).
- QA manual: o teste ponta a ponta pela UI no browser não pôde ser concluído nesta sessão — a
  ferramenta de automação de browser disponível encerrava a conexão a cada interação (ambiente
  instável, não um bug da aplicação). Em vez disso, o fluxo foi validado diretamente contra a API
  GraphQL real (backend local + banco de dev), reproduzindo exatamente as queries/mutations/
  variáveis que os services do frontend enviam: cadastro de dois usuários, criação de ambiente
  conjunto, convite por e-mail, aceite, criação de categoria/transação com `environmentId` e
  `memberId` implícitos (incluindo atribuição a um participante sem login), listagem confirmando
  os field resolvers `member`/`createdBy`, bloqueio de saída do último Admin sem indicar sucessor
  (e sucesso ao indicar), queda esperada para `FORBIDDEN` com a mensagem exata ao tentar acessar um
  ambiente após sair dele, exclusão só com 1 membro ativo restante, bloqueio de exclusão do
  ambiente pessoal, e erro claro ao convidar e-mail não cadastrado. Isso cobre a camada de
  contrato (services/queries/mutations) usada pela UI, mas não substitui um QA manual na interface
  — fica como pendência explícita (ver abaixo).

## Pendências / follow-ups

- **QA manual na interface (click-through no browser)** ainda não foi feito nesta tarefa, pelo
  motivo de instabilidade de ferramenta descrito acima. Recomenda-se rodar antes de considerar a
  feature pronta para produção: login, criar ambiente conjunto, convidar, aceitar convite,
  atribuir transação a um membro/participante, trocar de ambiente no seletor, sair/excluir
  ambiente. Isso deve ser feito numa etapa de QA separada (`docs/qa`), como já indicado pelo
  usuário que pediu esta implementação.
- ~~"Convites enviados" sem identificar o convidado~~ — **resolvido** (ver "Por que esse caminho
  foi escolhido" acima): backend passou a expor `invitedUser`, frontend atualizado para consumi-lo.
- **Dados de teste no banco de desenvolvimento**: o QA manual via API (acima) criou usuários e
  ambientes de teste (prefixo `qa.*@example.com`) no banco de dev usado por `backend/.env`. Não
  foram removidos nesta sessão — seguem a mesma política de limpeza em massa já documentada em
  [01-QA-BACK-ambientes-compartilhados](../../docs/qa/01-QA-BACK-ambientes-compartilhados.md)
  (`backend/scripts/qa-cleanup-all.ts`, cujo critério de detecção foi ampliado para cobrir também
  esse padrão de e-mail).
