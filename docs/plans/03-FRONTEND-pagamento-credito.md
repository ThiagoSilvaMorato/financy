# 03 - FRONTEND - Pagamento em crédito (parcelamento)

**Status:** Aprovado
**Data:** 2026-10-19
**Plano irmão:** [03-BACKEND-pagamento-credito](./03-BACKEND-pagamento-credito.md)

## Objetivo

No formulário de transação, acrescentar a escolha Débito/Crédito (Débito = à vista, igual ao
formulário de hoje; Crédito = compra dividida em N parcelas mensais). Ao salvar uma compra em
Crédito, as N parcelas já aparecem de uma vez nos meses certos — sem nenhuma mudança nas telas que
listam transações, dashboard ou totais por categoria, porque cada parcela já chega do backend como
uma transação comum (ver plano de backend).

## Abordagem proposta

### Seletor Débito/Crédito

- Novo componente `components/TransactionFormModal/components/PaymentMethodSelector/`, mesmo
  padrão visual/estrutural do `TypeSelector` já existente (dois botões lado a lado, estado
  controlado pelo form). Fica acima dos campos, logo depois do `TypeSelector`.
- **Débito selecionado por padrão.** Com Débito, o formulário continua **exatamente** como é hoje
  — nenhum campo novo, nenhuma mudança de comportamento, submit continua chamando
  `createTransaction`.
- Trocar para Crédito troca o conjunto de campos abaixo (ver próxima seção) e o que o submit
  chama (`createInstallmentPurchase` em vez de `createTransaction`). É só um estado local do
  formulário (`paymentMethod: "debit" | "credit"`) — não é um campo enviado pro backend; ele só
  decide qual mutation chamar e quais campos coletar.
- **Só aparece na criação, não na edição.** Editar uma transação existente (seja ela uma parcela
  de um crédito ou uma transação de débito) continua usando exatamente o formulário de hoje
  (`updateTransaction`), sem o seletor — decisão já tomada no plano de backend: só é possível
  editar parcela isolada, igual a qualquer transação. Mostrar o seletor na edição não faria
  sentido (não dá pra "converter" uma parcela já criada em outro parcelamento).

### Campos do formulário em Crédito

Reaproveita `description`, `categoryId`, `memberId`, `type` exatamente como estão hoje. Muda:

- **`date` → `startDate`**: não é um campo novo no formulário — é o mesmo campo `date` de
  `NewTransactionForm`/mesmo `DatePicker` já usado, só com o label mudando para "Data da 1ª
  parcela" quando Crédito está selecionado. No submit, esse mesmo valor é enviado como
  `startDate` pra `createInstallmentPurchase` (em vez de `date` pra `createTransaction`) — troca
  de nome só no mapeamento da chamada, não na estrutura do formulário.
- **`amount` ganha um `CustomCheckbox` ao lado** (componente já existente em
  `components/CustomCheckbox`, mesma convenção dos outros campos — nunca o primitivo Radix
  direto): "Esse é o valor total da compra" (marcado por padrão).
  Marcado → o valor digitado é o total, `amountIsTotal: true` na mutation. Desmarcado → o valor
  digitado já é o de cada parcela, `amountIsTotal: false`. O label do campo de valor muda
  conforme o checkbox ("Valor total da compra" / "Valor de cada parcela"), pra não confundir qual
  das duas coisas está sendo digitada.
- **Novo campo `installmentsCount`** (`CustomInput` numérico inteiro — sem decimais, "3,5
  parcelas" não faz sentido —, mínimo 2 e máximo 60 — mesmo limite do backend, ver plano de
  backend — validação do yup rejeitando 0/1 com a mensagem "Pra 1x, use Débito." e valores acima
  de 60 com "Máximo de 60 parcelas.").
- **Achado desta rodada — a validação do yup precisa ser condicional por `paymentMethod`, não uma
  regra fixa adicionada ao schema único que já existe**: o `validationSchema` atual em
  `TransactionFormModal/index.tsx` é um único `yup.object().shape({...})` usado tanto pra Débito
  quanto (depois desta tarefa) pra Crédito. `installmentsCount` só deve ser obrigatório/validado
  quando `paymentMethod === "credit"` — usar `.when("paymentMethod", { is: "credit", then: (s) =>
  s.required()...min(2)...max(60), otherwise: (s) => s.notRequired() })` (sintaxe do yup pra
  validação condicional). Sem isso, dois jeitos de quebrar a promessa "Débito continua exatamente
  como hoje": ou `installmentsCount` fica sempre opcional e nunca valida nada em Crédito, ou fica
  sempre obrigatório e passa a bloquear o submit de uma transação Débito comum por um campo que
  nem aparece na tela nesse modo.
- **Preview opcional, sem chamada ao backend**: mostrar embaixo do valor "12x de R$ 100,00" (ou,
  se `amountIsTotal` desmarcado, "Total: R$ 1.200,00"), calculado no cliente só pra feedback
  visual imediato, **arredondado a 2 casas decimais pra exibição** (ex.: dividir R$ 100 por 3 dá
  uma dízima — mostrar "R$ 33,33", nunca a dízima completa). A conta de verdade (com
  arredondamento na última parcela) é feita no backend; esse preview não precisa ser exato
  centavo a centavo, só dar uma ideia antes de salvar.

### Submit

- Débito: inalterado, chama `createTransaction`.
- Crédito: chama a nova mutation `createInstallmentPurchase` com
  `{ description, type, amount, amountIsTotal, installmentsCount, startDate, categoryId,
  environmentId (implícito, igual a hoje), memberId }`. Sucesso: toast "N parcelas criadas",
  fecha o modal, chama o mesmo `fetchData` já usado após `createTransaction` hoje.
  **Confirmado lendo `fetchTransactionData`/`pages/Transactions/index.tsx`**: `listTransactions`
  busca todas as transações do ambiente (sem filtro de data no servidor — débito técnico já
  registrado em `frontend/CLAUDE.md`) e o filtro de período no front tem `"all"` como padrão. Ou
  seja, **todas as N parcelas aparecem na lista imediatamente** depois do `fetchData`, não só a
  do "mês atual" — só ficariam de fora se o usuário já tivesse escolhido um mês específico no
  filtro antes de criar a compra (nesse caso só a parcela daquele mês, se houver, continua
  visível). Isso corrige uma suposição errada de uma rodada de revisão anterior deste mesmo
  plano (ver "Riscos" abaixo).

## Arquivos/áreas afetadas

- `components/TransactionFormModal/components/PaymentMethodSelector/` — novo.
- `components/TransactionFormModal/index.tsx` — adiciona o seletor (só na criação), campos
  condicionais de Crédito, lógica de submit trocando de mutation.
- `components/TransactionFormModal/models/index.ts` — `NewTransactionForm` ganha
  `paymentMethod?: "debit" | "credit"`, `amountIsTotal?: boolean`, `installmentsCount?: number`
  (todos opcionais/só relevantes quando `paymentMethod === "credit"`).
- `lib/graphql/mutation/CreateInstallmentPurchase.ts` — nova.
- `pages/Transactions/services/index.ts` — novo método `createInstallmentPurchase`, com seu
  próprio builder de input dedicado (ex.: `buildInstallmentPurchaseInput`), **não** reaproveitando
  `buildTransactionInput`/`TransactionInputVariables` existentes — esses já têm um formato fixo de
  campos (`type, description, date, amount, categoryId, memberId, environmentId`) que não inclui
  `amountIsTotal`/`installmentsCount`/`startDate`. `environmentId` injetado implicitamente do
  `useEnvironmentStore`, mesmo padrão de `buildTransactionInput`.
- `shared/models/transaction.ts` — `TransactionModel` ganha `installmentPurchaseId?: string |
  null` e `installmentNumber?: number | null` (só metadados — a descrição já formatada "5/12" já
  vem pronta em `description`, nenhuma tela precisa desses dois campos pra exibir nada).

## Riscos e alternativas consideradas

- **Seletor só na criação, nunca na edição**: decisão alinhada com o escopo do backend (só edição
  de parcela isolada) — editar uma transação continua sendo editar uma transação, sem reabrir a
  decisão "como essa parcela foi gerada".
- **Preview client-side pode divergir por 1 centavo do valor real gerado** (arredondamento fica
  na última parcela, calculado só no backend): aceitável, é só uma prévia — o toast de sucesso e a
  lista recarregada mostram os valores reais.
- **Checkbox "valor total" marcado por padrão**: decisão própria (o solicitante pediu as duas
  opções disponíveis, sem fixar qual é o padrão) — marcado por ser a forma mais comum de pensar
  numa compra parcelada ("paguei X em Nx"); fácil de revisar se o uso real mostrar o contrário.
- **Limite de 60 parcelas espelhado do backend**: achado da revisão do plano de backend — sem um
  limite superior, um erro de digitação no campo de parcelas criaria centenas de transações numa
  única chamada. O front valida o mesmo limite só pra dar feedback antes de enviar; a garantia de
  verdade é a validação do backend, que nunca confia só no que o client validou.
- **Correção de uma suposição errada da rodada anterior**: eu tinha assumido que a lista de
  transações era filtrada por "mês atual" por padrão, e que criar uma compra com `startDate`
  futuro não mostraria nada imediatamente. Lendo o código real (`fetchTransactionData`,
  `pages/Transactions/index.tsx`), isso está errado: o filtro padrão é `"all"` — `listTransactions`
  já busca tudo do ambiente sem filtro de data no servidor. Então, por padrão, **todas as N
  parcelas aparecem na lista imediatamente** depois de criar, independente do mês de cada uma. O
  único caso em que a lista não mudaria visualmente é se o usuário já tivesse escolhido um filtro
  de mês específico (não "all") antes de criar — nesse caso, só a parcela daquele mês específico
  (se houver) fica visível, o que é o comportamento esperado de um filtro de mês. Não há ação
  nenhuma pendente aqui — o comportamento já é o correto pelo próprio filtro existente, sem
  precisar de navegação automática.
- **Risco de performance pré-existente, agravado por esta tarefa**: `listTransactions` busca
  todas as transações do ambiente sem paginação no servidor (débito técnico já registrado em
  `frontend/CLAUDE.md`, não introduzido por esta tarefa). Cada compra parcelada pode adicionar até
  60 linhas de uma vez só; em ambientes com histórico longo e vários parcelamentos, isso piora um
  problema de escala que já existia, mas corrigir a paginação está fora do escopo desta tarefa —
  só registrando que o impacto cresce com o uso de Crédito.
