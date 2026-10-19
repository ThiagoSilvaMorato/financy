# 01 - FRONTEND - Ambientes compartilhados (contas conjuntas)

**Status:** Concluído — [registro de decisão](../../frontend/docs/01-ambientes-compartilhados.md)
**Data:** 2026-10-10
**Plano irmão:** [01-BACKEND-ambientes-compartilhados](./01-BACKEND-ambientes-compartilhados.md)

## Objetivo

Permitir criar e gerenciar ambientes compartilhados (contas conjuntas) a partir da tela de perfil,
alternar entre ambientes (pessoal e conjuntos) e atribuir cada transação a um membro ou
participante do ambiente ativo.

## Abordagem proposta

### Estado global (Zustand)

- Novo store `stores/environment`: `currentEnvironmentId`, `environments: EnvironmentModel[]`,
  ações `switchEnvironment(id)` e `refreshEnvironments()`. Persistido via `persist` como as demais
  stores, mas a troca pelo seletor é só de sessão — não altera `User.defaultEnvironmentId` no
  backend (isso é uma ação explícita separada, feita na tela de gerenciamento).
- Todas as queries/mutations de `Transaction`/`Category` passam a precisar do
  `currentEnvironmentId` como variável. Optar por enviar `environmentId` explicitamente em cada
  chamada de service (consistente com o padrão atual de "service local encapsula a
  query/mutation", sem lógica escondida num Apollo Link adicional).
- **Ambiente ativo ficar inválido durante a sessão**: se o usuário for removido do ambiente que
  está ativo, sair dele, ou excluí-lo (via `EnvironmentManagement`), ou se o backend retornar
  `FORBIDDEN` numa query/mutation por perda de acesso ao `environmentId` atual (ex.: sessão aberta
  em duas abas, removido numa e ainda operando na outra), `switchEnvironment` deve cair
  automaticamente para o ambiente pessoal e re-executar as queries — nunca deixar
  `currentEnvironmentId` apontando para um ambiente inacessível.

### Tela de Perfil (`pages/Profile/index.tsx`)

- Converter em abas (Radix `Tabs`): **"Perfil"** (conteúdo atual, sem alteração) e **"Ambientes"**
  (nova).
- Aba "Ambientes": lista de `EnvironmentModel` do usuário (query `listMyEnvironments`), cada item
  mostrando nome, badge "Pessoal" quando `isPersonal`, badge do `role` do usuário naquele ambiente,
  e botão "Gerenciar".
- Botão "Criar ambiente conjunto" abre um `Dialog` (Radix) com um único `CustomInput` (nome). Ao
  confirmar: mutation `createEnvironment`, seguida de `switchEnvironment(novoId)` e navegação
  direta para a tela de gerenciamento do ambiente recém-criado.
- Nova seção **"Convites pendentes"** na mesma aba (query `listMyPendingInvites`): lista de
  convites recebidos (nome do ambiente, quem convidou, papel oferecido), com botões "Aceitar"
  (`acceptEnvironmentInvite`, depois `refreshEnvironments()`) e "Recusar"
  (`declineEnvironmentInvite`). Sem essa seção não existe nenhum lugar na UI onde o convidado possa
  de fato entrar no ambiente — o e-mail avisa, mas a ação exige sessão autenticada, então precisa
  acontecer dentro do app.

### Nova tela de gerenciamento (`pages/EnvironmentManagement/index.tsx`, rota `/environments/:id`)

- Acessada apenas pelo botão "Gerenciar" da lista em Profile > Ambientes — sem item fixo na
  navegação principal.
- Seções: lista de membros reais **ativos** (ações de promover/remover, visíveis só se o usuário
  logado é Admin daquele ambiente), lista de participantes (criar/remover, Admin only), formulário
  de convite por e-mail com `CustomSelect` de papel (Admin/User, default User) — `role` exigido
  pelo `InviteMemberInput` do backend (Admin only; a validação de "e-mail precisa ser de conta já
  cadastrada" é responsabilidade do backend, o form só exibe o erro retornado), renomear (Admin
  only) e excluir (Admin only, habilitado apenas quando a lista de membros reais ativos tem 1 item,
  com confirmação explícita por ser destrutivo).
- Ação "sair do ambiente": se o backend indicar que quem está saindo é o último Admin com outros
  membros restantes, abre modal para escolher o novo Admin antes de confirmar a saída.
- Seção **"Convites enviados"** (query `listEnvironmentInvites`, Admin only): lista os convites
  `pending` daquele ambiente (e-mail convidado, papel oferecido) com ação "Cancelar"
  (`cancelEnvironmentInvite`). Sem isso, quem convida não tem como saber se um convite já foi
  aceito, recusado ou ainda está pendente, nem como desfazer um convite enviado por engano.

### Seletor de ambiente (ao lado do avatar)

- Novo componente compartilhado `components/EnvironmentSwitcher`, lendo de `stores/environment`.
  Ao clicar, abre um modal/listbox com os ambientes do usuário; a seleção chama
  `switchEnvironment` e reexecuta as queries de transações/categorias para o ambiente novo.

### Transações e categorias

- `CreateTransactionInput`/`CreateCategoryInput` (e os formulários correspondentes) passam a
  enviar `environmentId` do ambiente ativo automaticamente — campo implícito pela sessão, não
  visível ao usuário.
- Formulário de transação ganha um `CustomSelect` novo — "De quem é essa transação" (`memberId`),
  populado com os membros reais e participantes do ambiente ativo; valor padrão é o próprio
  usuário logado. O `EnvironmentMember.id` correspondente ao "eu mesmo" é derivado da lista de
  membros do ambiente ativo já trazida por `listMyEnvironments` (`members.find(m => m.user?.id
  === currentUserId)`), sem precisar de uma query adicional.
- Agrupamento/filtro de relatórios por `memberId` fica fora deste plano (dashboard hoje não tem
  esse tipo de agrupamento) — fica registrado como pendência para um plano futuro.

## Arquivos/áreas afetadas

- `src/pages/Profile/index.tsx` — adicionar `Tabs`.
- `src/pages/Profile/components/EnvironmentsTab/` — nova (inclui a lista de convites pendentes).
- `src/pages/EnvironmentManagement/` — nova página (`index.tsx`, `components/`, `services/`).
- `src/components/EnvironmentSwitcher/` — novo componente compartilhado.
- `src/stores/environment/` — novo store.
- `src/lib/graphql/queries/Environment.ts`, `src/lib/graphql/mutation/Environment.ts` — novas.
- `src/shared/models/` — `EnvironmentModel`, `EnvironmentMemberModel`, `EnvironmentInviteModel`.
- Formulários de criação/edição de transação existentes — adicionar campo `memberId`.
- `src/types/index.ts` — o campo `role` de `User` existe hoje de forma especulativa (nunca
  preenchido pelo backend). Avaliar se ele passa a representar o `role` do usuário no ambiente
  ativo ali mesmo, ou se é mais correto mover essa informação para `EnvironmentMemberModel` (mais
  coerente, já que `role` é por ambiente, não global do usuário) — decidir na implementação.

## Riscos e alternativas consideradas

- **Alternativa descartada: gerenciamento do ambiente como item fixo na navegação principal.**
  Descartada a pedido do usuário; a gestão fica como ação acessada a partir da lista em Profile,
  evitando poluir a navegação principal com algo usado com pouca frequência.
- **Alternativa descartada: trocar de ambiente já atualiza o padrão de login.** Descartada para
  não alterar o comportamento de login só por uma troca de visualização pontual; definir o padrão
  fica como ação explícita separada.
- **Risco de UX**: com `environmentId` implícito pela sessão em toda operação, um usuário com
  várias abas abertas em ambientes diferentes pode se confundir sobre "em qual ambiente estou" — o
  seletor precisa deixar isso sempre visível, não só numa tela de configuração.
- **Pendência de design**: filtro/agrupamento de relatórios por `memberId` foi identificado na
  discussão mas deliberadamente deixado fora deste plano — merece plano próprio quando chegar a
  hora.
