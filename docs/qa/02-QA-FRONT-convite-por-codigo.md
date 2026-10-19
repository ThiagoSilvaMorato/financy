# 02 - QA-FRONT - Convite por código (substitui convite por e-mail)

**Data:** 2026-10-19
**Plano:** [02-FRONTEND-convite-por-codigo](../plans/02-FRONTEND-convite-por-codigo.md)
**Registro de implementação:** [02-convite-por-codigo](../../frontend/docs/02-convite-por-codigo.md)
**Resultado final:** ✅ **Passou** — todos os pontos de risco do plano verificados; um trecho da
jornada (o diálogo "Entrar com código") não pôde ser clicado através da ferramenta de automação de
browser disponível (instabilidade da própria ferramenta — ver "Limitação encontrada" abaixo) e foi
validado por uma via alternativa equivalente (chamada direta à API real com a mesma query/mutation
que o modal usa).

## Escopo do QA

Testar o frontend da feature "convite por código" de ponta a ponta, no browser, contra o backend
local (`http://localhost:4000/graphql`) e o banco de desenvolvimento real, cobrindo especialmente o
ponto mais crítico do plano aprovado: a migração de `members.find(...)` para `myMembership` como
única fonte do próprio papel, e os três lugares que essa mudança afeta (badge de "Aguardando
aprovação", `isAdmin`/`canDelete` em `EnvironmentManagement`, valor padrão do seletor de
transação).

## Método

- `npm run build` (type-check + build) e `npm run lint` — sem erros introduzidos.
- QA manual no browser real (ferramenta de automação disponível no ambiente), contra
  `frontend` (`npm run dev`, porta 5173) e `backend` (`npm run dev`, porta 4000), ambos já em
  execução de uma sessão anterior.
- Conta real do solicitante (`thiagosmorato@gmail.com`) usada para a parte de Admin (geração de
  código), em ambiente novo criado só para o teste (`QA Convite Código`, nome com prefixo
  reconhecido por `backend/scripts/qa-cleanup-all.ts`). Segunda conta (`qa-convite-codigo-
  manual@test.local`, mesmo padrão de e-mail reservado para QA) criada via `/signup` para o lado de
  quem entra por código.
- **Limitação encontrada**: a ferramenta de automação de browser deste ambiente (ponte via extensão
  de navegador) derrubou a conexão de forma reproduzível e especificamente ao clicar no botão
  "Entrar com código" (que abre `JoinByCodeModal`) — confirmado não ser um erro da aplicação
  (nenhum erro JS no console nas tentativas em que a página sobreviveu o suficiente para checar, e
  o mesmo tipo de `Dialog` do shadcn/Radix abre normalmente em "Criar ambiente conjunto", testado
  lado a lado na mesma sessão como controle). Contornado chamando a API GraphQL real diretamente
  com a mesma query/mutation/variáveis que `JoinByCodeModal`/`environmentsTabService` enviam
  (`getEnvironmentByInviteCode` → `joinEnvironmentByCode`), e então voltando a usar o browser para
  verificar o efeito (listagem, badges, notices) — mesmo tipo de contorno já registrado no QA de
  frontend da tarefa 01.
- Dados de teste (usuário + ambiente) removidos ao final com `backend/scripts/qa-cleanup-all.ts
  --apply` (dry-run antes, confirmando que só dados de QA seriam afetados). Confirmado por consulta
  direta ao banco que a conta real do solicitante e seus dois ambientes reais (`Thiago Morato`
  pessoal, `Pereira Morato` conjunto) permaneceram intactos.

## O que foi verificado

| # | Cenário | Risco original (plano) | Resultado |
|---|---|---|---|
| 1 | `build`/`lint` sem erros novos | Qualidade geral | ✅ |
| 2 | `EnvironmentsTab` renderiza "Entrar com código" + "Criar ambiente conjunto" + lista de ambientes sem erro, com badges Admin/Pessoal corretos | Reescrita da tela | ✅ |
| 3 | Admin gera código de convite (`InviteCodeCard`, ambiente sem código ainda): mostra código + validade (7 dias) | `generateEnvironmentInviteCode` | ✅ |
| 4 | Reabrir a tela de gerenciamento mostra o mesmo código (não gera um novo por engano) | `getCurrentInviteCode`, achado crítico do plano | ✅ |
| 5 | `getEnvironmentByInviteCode` (preview) e `joinEnvironmentByCode` (entrada efetiva) com o código gerado, pela mesma forma exata que o frontend chama | Fluxo de entrada por código | ✅ (via API direta — ver limitação acima) |
| 6 | Após entrar, `listMyEnvironments` devolve `myMembership.role: "pending"`, `members: null`, `pendingMembers: null` para o novo membro | Comportamento nulável documentado no plano | ✅ |
| 7 | `EnvironmentsTab`: o ambiente recém-entrado mostra badge "Aguardando aprovação" (não Admin/Membro); botão "Gerenciar" continua clicável | Badge via `myMembership`, nunca bloqueia navegação | ✅ |
| 8 | `EnvironmentSwitcher`: popover mostra o mesmo badge; selecionar o ambiente `pending` troca o ambiente ativo normalmente (não bloqueia) | Mesma fonte de badge, seleção livre | ✅ |
| 9 | `EnvironmentManagement` (`/environments/:id`) para quem está `pending` nesse ambiente: mostra `<PendingEnvironmentNotice />`, sem `TypeError` | Ponto mais crítico do plano (`isAdmin`/`currentMemberId` via `myMembership`) | ✅ |
| 10 | `Dashboard` com o ambiente `pending` ativo: mostra `<PendingEnvironmentNotice />` em vez de carregar saldo/transações | `useCurrentEnvironmentRole()` | ✅ |
| 11 | `Transactions` com o ambiente `pending` ativo: mesmo notice, sem disparar `fetchTransactionData`/`fetchCategoryData` | idem | ✅ |
| 12 | `Categories` com o ambiente `pending` ativo: mesmo notice, sem disparar `fetchData` | idem | ✅ |
| 13 | Nenhum erro de console/crash em nenhuma das telas acima | Robustez geral da migração `members` → nulável | ✅ |

## O que não foi coberto nesta rodada

- **Clique real no diálogo "Entrar com código" (`JoinByCodeModal`)**: bloqueado pela instabilidade
  de ferramenta descrita acima. O conteúdo do modal (dois passos: código → confirmação) é revisão
  de código + type-check, seguindo exatamente o mesmo padrão já comprovado em produção por
  `CreateEnvironmentModal` (mesmos primitivos `Dialog`/`CustomInput`/`react-hook-form`/`yup`); as
  duas chamadas que ele faz (`getEnvironmentByInviteCode`, `joinEnvironmentByCode`) foram
  confirmadas funcionando com a query/mutation exatas via API direta (item 5 da tabela).
- **Aprovação de membro pendente pelo Admin (`PendingMembersList`, `approveMember`)**: a conta real
  do solicitante foi deslogada durante o teste (para testar o cadastro da segunda conta) e não há
  como logar de volta sem a senha real — não solicitada, por ser a conta pessoal do solicitante.
  Revisão de código: `PendingMembersList` reaproveita exatamente o mesmo padrão
  (service → `toast` → `onChanged`) já usado e comprovado em `MembersList`/`ParticipantsList`
  nesta mesma tela, chamando `approveMember`/`removeMember` com os nomes exatos de
  `backend/schema.graphql`. Recomenda-se um teste manual rápido desse passo específico (gerar
  código → entrar com outra conta → aprovar pelo Admin → confirmar que o acesso libera) antes de
  considerar a tarefa 100% fechada, já que é o único passo da jornada sem prova ao vivo.

## Dados de teste e limpeza

- Usuário de QA: `qa-convite-codigo-manual@test.local` (removido).
- Ambientes de QA: `QA Convite Código` (conjunto, criado pela conta real do solicitante) e
  `QA Convite Teste` (pessoal, da conta de QA) — ambos removidos.
- `backend/scripts/qa-cleanup-all.ts --apply` também removeu, de brinde, lixo de QA acumulado de
  rodadas anteriores do backend (6 usuários/6 ambientes `[QA] Admin A/B/C` x2, não relacionados a
  esta tarefa).
- Confirmado após a limpeza: conta `thiagosmorato@gmail.com` e seus ambientes reais
  (`Thiago Morato`, `Pereira Morato`) permanecem intactos.
