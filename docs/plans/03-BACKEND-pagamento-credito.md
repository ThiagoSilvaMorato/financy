# 03 - BACKEND - Pagamento em crédito (parcelamento)

**Status:** Concluído — ver [registro de implementação](../../backend/docs/03-pagamento-credito.md) e [QA](../qa/03-QA-BACK-pagamento-credito.md)
**Data:** 2026-10-19
**Plano irmão:** [03-FRONTEND-pagamento-credito](./03-FRONTEND-pagamento-credito.md)

## Objetivo

Hoje toda transação é, na prática, "à vista" (Débito). Adicionar um segundo método de pagamento,
Crédito, que representa uma compra dividida em N parcelas mensais: ao criar, o sistema gera de uma
vez **N transações reais**, uma por mês, cada uma já nomeada "`<descrição> <parcela>/<total>`"
(ex.: "Pós-graduação 5/12"), de forma que cada mês só mostra a parcela que realmente cai nele —
sem lógica nova em nenhuma tela existente de listagem/dashboard.

## Abordagem proposta

### Por que materializar as N transações, em vez de calcular por mês

Alternativa considerada e descartada: guardar só "o plano" (descrição, total, N, início) e, a cada
consulta de transações de um mês, calcular se existe uma parcela cabendo naquele mês. Isso
exigiria reescrever `listTransactions` (e qualquer outro lugar que já soma/lista transações —
dashboard, totais por categoria) pra saber misturar linhas reais com linhas "virtuais" calculadas
on-the-fly, e complicaria editar/excluir uma parcela específica (não seria uma `Transaction` de
verdade). Criando as N linhas reais no momento da compra, **nada no resto do sistema precisa
saber que isso existe** — cada parcela é uma `Transaction` comum, com `date` já no mês certo;
`listTransactions(environmentId)` filtrado por mês já devolve só o que cabe naquele mês, do jeito
que já funciona hoje.

### Nova entidade: `InstallmentPurchase`

```prisma
model InstallmentPurchase {
  id               String          @id @default(uuid())
  description      String
  type             TransactionType
  totalAmount       String
  installmentAmount String
  installmentsCount Int
  startDate         DateTime
  categoryId        String
  category          Category     @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  environmentId     String
  environment       Environment  @relation(fields: [environmentId], references: [id], onDelete: Cascade)
  memberId           String
  member             EnvironmentMember @relation(fields: [memberId], references: [id], onDelete: Restrict)
  createdByUserId    String
  createdByUser      User         @relation(fields: [createdByUserId], references: [id], onDelete: Cascade)
  transactions       Transaction[]
  createdAt          DateTime     @default(now())
}
```

- Guarda a compra como um todo — serve de "recibo"/agrupador. `totalAmount` e `installmentAmount`
  são calculados e persistidos no momento da criação (não recalculados depois), pra sempre bater
  com o que de fato foi gerado, mesmo que no futuro alguém edite uma parcela individual.
- `memberId` com `onDelete: Restrict` (mesmo motivo de `Transaction.memberId` na tarefa 01: nunca
  deveria sofrer um delete físico fora de um fluxo controlado — aqui nem existe fluxo de exclusão
  do `InstallmentPurchase` nesta tarefa, então `Restrict` é só uma salvaguarda).

### `Transaction` ganha dois campos novos, ambos nuláveis

- `installmentPurchaseId: String?` — `null` significa "transação normal" (o que já existe hoje,
  Débito). Preenchido significa "é uma parcela desta compra". `onDelete: SetNull` (não `Cascade`
  nem `Restrict`): se um `InstallmentPurchase` for apagado por qualquer motivo, a transação em si
  — histórico financeiro real — nunca deveria desaparecer só por perder o metadado de agrupamento;
  ela só perde a referência e volta a ser indistinguível de uma transação normal.
- `installmentNumber: Int?` — posição da parcela (1-based). Só usado pra metadados/agrupamento;
  **a descrição formatada ("5/12") é gravada direto em `Transaction.description` no momento da
  criação**, não calculada em tempo de leitura — assim nenhuma tela existente (dashboard, lista,
  totais) precisa saber formatar isso, e editar a descrição de uma parcela funciona exatamente
  como editar a descrição de qualquer transação hoje.
- Lembrete de schema (fácil de esquecer): `installmentPurchaseId` é o campo escalar, mas o Prisma
  também exige o campo de relação em si (`installmentPurchase InstallmentPurchase? @relation(...,
  onDelete: SetNull)`) — sem ele, `prisma validate` falha. Da mesma forma, `InstallmentPurchase`
  precisa de back-relations em `User` (quem criou), `Category`, `Environment` e
  `EnvironmentMember` — os quatro lados do relacionamento, mesma exigência que já apareceu nas
  tarefas 01/02 com `EnvironmentMember`/`EnvironmentInvite`.
- `installmentPurchaseId`/`installmentNumber` **nunca entram em `CreateTransactionInput` nem em
  `UpdateTransactionInput`** — só são expostos no `TransactionModel` de saída. Isso fecha, pela
  própria forma do schema (não por uma checagem em runtime), qualquer jeito de alguém editar uma
  transação comum e "fingir" que ela é parcela de uma compra parcelada — só
  `createInstallmentPurchase` grava esses campos.

### Achado de revisão: `InstallmentPurchase` participa de duas exclusões em cascata já existentes

`deleteCategory` e `deleteEnvironment` já fazem exclusão explícita e ordenada (não dependem de
cascade implícito do banco) — ver código atual de `CategoryService.deleteCategory`:
`$transaction([transaction.deleteMany({categoryId}), category.delete({id})])`, e
`EnvironmentService.deleteEnvironment` com a mesma lógica pra `Transaction`/`Category`/
`EnvironmentMember`/`Environment`. Com `InstallmentPurchase.categoryId`/`environmentId` em
`onDelete: Cascade`, o banco cascatearia a exclusão de qualquer `InstallmentPurchase` sozinho
quando a `Category`/`Environment` for apagada — **funcionaria por acidente** (a ordem atual já
apaga a `Category` antes de tentar apagar o `EnvironmentMember`, então o `Restrict` de
`InstallmentPurchase.memberId` nunca chegaria a ser violado), mas depender disso é frágil: quem
ler só o código de `deleteEnvironment`/`deleteCategory` não veria `InstallmentPurchase` em lugar
nenhum e não saberia que a ordem das linhas importa pra essa entidade nova.

**Correção**: adicionar o delete explícito nos dois lugares, cada um com a restrição que de fato
importa pra ele:
- `deleteCategory`: `installmentPurchase.deleteMany({ where: { categoryId: id } })` em qualquer
  posição antes de `category.delete({ id })` (não existe `EnvironmentMember` nessa função — a
  única coisa que precisa vir depois é a própria `Category`).
- `deleteEnvironment`: `installmentPurchase.deleteMany({ where: { environmentId } })` em qualquer
  posição **antes** de `environmentMember.deleteMany` especificamente (esse é o único passo cuja
  ordem importa, por causa do `Restrict` em `InstallmentPurchase.memberId`).

Mesmo estilo que o resto do código já usa, sem depender de cascade implícito do banco.

### Mutation: `createInstallmentPurchase`

```graphql
input CreateInstallmentPurchaseInput {
  description: String!
  type: String!            # "income" | "expense"
  amount: String!          # valor total OU valor de cada parcela, dependendo de amountIsTotal
  amountIsTotal: Boolean!
  installmentsCount: Int!  # mínimo 2 — 1x não precisa de parcelamento, é só Débito
  startDate: DateTimeISO!
  categoryId: String!
  environmentId: String!
  memberId: String!
}
```

`EnvironmentService`/`TransactionService` — decisão de onde colocar: como a regra de negócio
central é sobre `Transaction` (cria N delas) e reaproveita validações já existentes em
`TransactionService` (`assertMemberBelongsToEnvironment`, que já bloqueia atribuir a um membro
`pending` — mesma regra vale aqui), o método fica em `TransactionService`, não em
`EnvironmentService`.

1. `data.type !== "income" && data.type !== "expense"` → erro, mesma checagem já feita em
   `createTransaction` (o campo `type` do input GraphQL é `String`, não um enum validado pelo
   schema — a validação é só em runtime, igual hoje).
2. `assertEnvironmentAccess(environmentId, userId)` + `assertMemberBelongsToEnvironment(memberId,
   environmentId)` — mesmas checagens de `createTransaction`.
3. **Achado desta rodada**: `category.environmentId !== environmentId` → erro ("Categoria
   inválida para este ambiente."). `createTransaction` hoje **não faz essa checagem** — conecta a
   categoria só por `id`, sem confirmar que ela pertence ao mesmo ambiente da transação (lacuna
   pré-existente, não introduzida por esta tarefa, fora de escopo corrigir ali). Mas como esta
   mutation nova cria `installmentsCount` transações de uma vez a partir de uma única categoria
   informada, o impacto de não validar é maior aqui (até 60 transações teriam a mesma categoria
   errada, não 1) — vale a checagem explícita nesta mutation nova, mesmo sem tocar na antiga.
4. `installmentsCount < 2` → erro ("Parcelamento precisa de pelo menos 2 parcelas — pra 1x, use
   Débito."). `installmentsCount > 60` → erro ("Máximo de 60 parcelas."). O limite superior é uma
   salvaguarda contra erro de digitação (ex.: "1200" em vez de "12") virar uma criação em massa de
   transações de uma vez só — 60 (5 anos mensais) já é mais do que qualquer parcelamento real
   costuma ter, mas é um número arbitrário, fácil de ajustar se aparecer um caso de uso legítimo
   maior.
5. `parseMoneyString(amount)` não numérico, `NaN`, ou `<= 0` → erro ("Valor inválido.").
6. Calcula `totalAmount`/`installmentAmount` a partir de `amount` + `amountIsTotal` (ver seção de
   dinheiro abaixo).
7. Cria o `InstallmentPurchase`.
8. Para `k` de `0` a `installmentsCount - 1`: calcula a data (ver seção de datas abaixo), cria a
   `Transaction` com `description: "${description} ${k + 1}/${installmentsCount}"`, `amount`
   (igual a `installmentAmount`, exceto a última parcela — ver arredondamento abaixo),
   `installmentPurchaseId`, `installmentNumber: k + 1`.
9. Passos 7-8 numa única `$transaction` do Prisma (atômico — mesmo padrão já usado em
   `deleteEnvironment`/`deleteCategory`: tudo ou nada).
10. Retorna as `installmentsCount` transações criadas (`[TransactionModel!]!`) — o frontend pode
    confirmar "N parcelas criadas" sem precisar de uma query extra.

### Dinheiro: evitar erro de arredondamento acumulado

- `amount` chega como string, possivelmente em formato pt-BR (`"1.234,56"`) ou com ponto
  (`"1234.56"`) — mesma ambiguidade que `CategoryService.totalAmount` já trata hoje (lógica
  **duplicada** ali e em `frontend/utils/stringToNumber.ts`, conforme já apontado em
  `backend/CLAUDE.md`). Em vez de duplicar essa lógica uma terceira vez, extrair um helper
  compartilhado agora: `src/utils/money.ts` com `parseMoneyString(value: string): number` (a
  lógica de normalização já existente) e `formatMoneyString(value: number): string` (equivalente a
  `total.toFixed(2)`). `CategoryService.totalAmount` passa a usar esse helper em vez da cópia
  inline — código do escoteiro, já que o arquivo precisa ser tocado de qualquer forma nesta tarefa
  (ver "Arquivos afetados").
- A divisão **nunca** deve ser feita em float direto (`totalAmount / installmentsCount` como
  `Number`) — erro de ponto flutuante se acumula de forma visível ao longo de várias parcelas
  (ex.: 12 parcelas de uma divisão que não é exata). Fazer a conta em **centavos inteiros**:
  `totalCents = Math.round(parseMoneyString(amount) * 100)`, `installmentCents =
  Math.floor(totalCents / installmentsCount)`, resto `= totalCents - installmentCents *
  installmentsCount` somado só na **última** parcela. Reconverter pra string só no final
  (`formatMoneyString(cents / 100)`).
- Se `amountIsTotal: false` (o valor informado já é o de cada parcela), não há divisão nem
  arredondamento a redistribuir — mas a multiplicação **ainda** deve ser feita em centavos
  inteiros (`installmentCents = Math.round(parseMoneyString(amount) * 100); totalCents =
  installmentCents * installmentsCount`), não em float direto: multiplicação em float pode gerar
  artefato de ponto flutuante mesmo sem precisar de arredondamento "de verdade" (ex.: `0.1 * 3`
  não é exatamente `0.3` em JS). Reconverter pra string só no final, igual ao outro caso.

### Datas: mesma dia-do-mês, com ajuste de fim de mês

- Parcela `k` cai no mesmo dia do mês de `startDate`, `k` meses depois — ex.: primeira parcela
  31/01 → segunda parcela 28/02 (ou 29 em ano bissexto), não 03/03. Calcular isso à mão com
  `Date` nativo do JS é um erro comum (overflow de mês) — usar `date-fns` (`addMonths`, que já
  clampa corretamente pro último dia do mês de destino). O backend **não tem `date-fns` hoje**
  (frontend já tem, `^4.1.0`) — adicionar como dependência nova do backend, mesma versão por
  consistência.

## Arquivos/áreas afetadas

- `prisma/schema.prisma` — novo model `InstallmentPurchase`; `Transaction` ganha
  `installmentPurchaseId`/`installmentNumber`.
- `prisma/migrations/` — nova migration.
- `backend/package.json` — adiciona `date-fns`.
- `src/models/installment-purchase.model.ts` — **avaliar na implementação se é necessário**: esta
  tarefa não tem nenhuma query que devolva `InstallmentPurchase` diretamente (o retorno de
  `createInstallmentPurchase` é `[TransactionModel!]!`), então o model GraphQL só é preciso se
  `TransactionModel` ganhar um field resolver `installmentPurchase` (ex.: pra um futuro "ver
  outras parcelas desta compra" — não faz parte do escopo atual). Se não for criado esse field
  resolver, não é preciso expor o model GraphQL agora.
- `src/models/transaction.model.ts` — expõe `installmentPurchaseId`/`installmentNumber`.
- `src/utils/money.ts` — novo, extrai `parseMoneyString`/`formatMoneyString` de
  `CategoryService.totalAmount`.
- `src/services/category.service.ts` — `totalAmount` passa a usar `src/utils/money.ts`;
  `deleteCategory` ganha o `installmentPurchase.deleteMany` explícito (ver achado de revisão
  acima).
- `src/services/environment.service.ts` — `deleteEnvironment` ganha o mesmo
  `installmentPurchase.deleteMany` explícito.
- `src/services/transaction.service.ts` — novo método `createInstallmentPurchase`.
- `src/resolvers/transaction.resolver.ts` — nova mutation `createInstallmentPurchase`.
- `src/dto/input/transaction.input.ts` — novo `CreateInstallmentPurchaseInput`.

## Riscos e alternativas consideradas

- **Alternativa descartada: calcular parcelas em tempo de leitura (sem materializar).** Ver seção
  acima — rejeitada por exigir reescrever toda consulta de transação existente.
- **Escopo desta tarefa, por decisão explícita do solicitante**: só é possível editar/excluir uma
  parcela isolada (reaproveitando `updateTransaction`/`deleteTransaction` existentes, sem mudança
  nenhuma neles — cada parcela já é uma `Transaction` comum). Não há, nesta tarefa, uma ação pra
  cancelar parcelas futuras em massa nem pra editar o `InstallmentPurchase` propagando pra todas as
  parcelas — ambas foram consideradas e descartadas pelo solicitante pra uma v1. Registrar como
  pendência pra uma tarefa futura caso o produto queira isso depois.
- **Arredondamento na última parcela**: convenção comum em fatura de cartão de crédito de
  verdade — evita que a soma das parcelas feche com 1 centavo de diferença do total informado.
- **`InstallmentPurchase` pode ficar "órfão"** (zero `Transaction` referenciando ele) se todas as
  parcelas forem excluídas uma a uma — aceitável nesta tarefa (não há exclusão em massa do plano
  pra se preocupar com isso); registrar como débito técnico conhecido, não um bug.
- **`amountIsTotal` como booleano na API, checkbox no front**: decisão explícita do solicitante.
- **Achados desta rodada de revisão**: (1) `category.environmentId` não era validado contra o
  `environmentId` da mutation — `createTransaction` já tem essa lacuna hoje, mas nesta mutation
  nova o impacto é maior (até 60 transações com a categoria errada de uma vez, não 1); corrigido
  com uma checagem explícita nova, sem tocar em `createTransaction`. (2) `installmentsCount` não
  tinha limite superior — um erro de digitação ("1200" em vez de "12") criaria centenas de
  transações numa única chamada; corrigido com um máximo de 60. (3) `installmentPurchaseId`/
  `installmentNumber` precisam ficar de fora dos dois inputs de transação (`Create`/`Update`) —
  registrado explicitamente pra não vazar pra lá por descuido na hora de implementar.
