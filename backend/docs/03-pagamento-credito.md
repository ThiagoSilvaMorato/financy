# Pagamento em crédito (parcelamento)

**Data:** 2026-10-20
**Plano:** [03-BACKEND-pagamento-credito](../../docs/plans/03-BACKEND-pagamento-credito.md)

## O que foi feito

- **Prisma (`prisma/schema.prisma`)**: novo model `InstallmentPurchase` (agrupador/"recibo" de uma
  compra parcelada — `description`, `type`, `totalAmount`, `installmentAmount`,
  `installmentsCount`, `startDate`, `categoryId`/`environmentId`/`memberId`/`createdByUserId` com
  as respectivas relações, `memberId` com `onDelete: Restrict`). `Transaction` ganha
  `installmentPurchaseId`/`installmentPurchase` (`onDelete: SetNull`) e `installmentNumber`, ambos
  nuláveis. Back-relations adicionadas em `User.createdInstallmentPurchases`,
  `Category.installmentPurchases`, `Environment.installmentPurchases`,
  `EnvironmentMember.installmentPurchases` (exigência do Prisma para os quatro lados do
  relacionamento, mesmo padrão já usado nas tarefas 01/02 com `EnvironmentMember`/
  `EnvironmentInviteCode`).
- **Migration manual**
  (`prisma/migrations/20261020034201_pagamento_credito/migration.sql`): adiciona as duas colunas
  em `Transaction`, cria a tabela `InstallmentPurchase` e as 5 FKs. Sem backfill (colunas novas e
  nuláveis, nenhuma transação existente é afetada). Gerada com `prisma migrate diff --from-url ...
  --to-schema-datamodel schema.prisma --script` pra conferir o DDL exato e aplicada com `prisma
  migrate deploy` — mesmo motivo de `migrate dev` ser inviável em ambiente não-interativo já
  registrado em [01-ambientes-compartilhados.md](./01-ambientes-compartilhados.md).
- **`backend/package.json`**: nova dependência `date-fns` (`^4.1.0`, mesma versão do frontend).
  Usada só por `addMonths`, pra calcular a data de cada parcela sem o overflow de mês do `Date`
  nativo (ex.: 31/01 + 1 mês vira 28/02, não 03/03).
- **`src/utils/money.ts`** (novo): `parseMoneyString`/`formatMoneyString`, extraídos da lógica que
  já existia (duplicada) em `CategoryService.totalAmount`. `CategoryService.totalAmount` passa a
  usar esse helper em vez da cópia inline — código do escoteiro, já que o arquivo precisava ser
  tocado de qualquer forma nesta tarefa (`deleteCategory`, ver abaixo).
- **`src/services/category.service.ts`**: `totalAmount` usa `src/utils/money.ts`. `deleteCategory`
  ganha `installmentPurchase.deleteMany({ where: { categoryId: id } })` explícito antes de
  `category.delete`, na mesma `$transaction`.
- **`src/services/environment.service.ts`**: `deleteEnvironment` ganha
  `installmentPurchase.deleteMany({ where: { environmentId } })` explícito, antes de
  `environmentMember.deleteMany` (ordem que importa por causa do `onDelete: Restrict` em
  `InstallmentPurchase.memberId`).
- **`src/services/transaction.service.ts`**: novo método `createInstallmentPurchase`, nesta ordem
  de validação: tipo (`income`/`expense`), `assertEnvironmentAccess` +
  `assertMemberBelongsToEnvironment` (reaproveitados de `createTransaction`), categoria pertence ao
  mesmo `environmentId` (checagem nova — ver "Achado" abaixo), `installmentsCount` entre 2 e 60,
  valor numérico positivo. Calcula `totalAmount`/`installmentAmount` em centavos inteiros (nunca
  float direto — ver seção "Por que esse caminho foi escolhido"), gera um `id` para o
  `InstallmentPurchase` com `crypto.randomUUID()` e cria o agrupador + as N transações (com
  `description` já formatada `"<descrição> <k>/<N>"`, `date` via `addMonths`, `amount` em
  centavos com o resto na última parcela) numa única `$transaction` em array (atômico).
- **`src/dto/input/transaction.input.ts`**: novo `CreateInstallmentPurchaseInput` (`description`,
  `type`, `amount`, `amountIsTotal`, `installmentsCount`, `startDate`, `categoryId`,
  `environmentId`, `memberId`). Não ganhou `installmentPurchaseId`/`installmentNumber` — e
  `CreateTransactionInput` (usado também por `updateTransaction`) também não, de propósito.
- **`src/models/transaction.model.ts`**: `TransactionModel` ganha `installmentPurchaseId`/
  `installmentNumber`, ambos nuláveis, só de saída.
- **`src/resolvers/transaction.resolver.ts`**: nova mutation `createInstallmentPurchase(data:
  CreateInstallmentPurchaseInput!): [TransactionModel!]!`, delegando pro service (resolver fino).
- Nenhum model GraphQL novo para `InstallmentPurchase` em si — não há query que o devolva
  diretamente (só field resolvers em `TransactionModel`, nenhum foi adicionado nesta tarefa).

## Por que foi feito

Hoje toda transação é "à vista" (Débito). O pedido foi adicionar um segundo método de pagamento,
Crédito, representando uma compra dividida em N parcelas mensais, sem que nenhuma tela existente
(dashboard, listagem, totais por categoria) precise saber que parcelamento existe.

## Por que esse caminho foi escolhido

- **Materializar as N transações na criação, não calcular por mês**: a alternativa (guardar só "o
  plano" e calcular parcelas em tempo de leitura) exigiria reescrever `listTransactions` e
  qualquer lugar que já soma/lista transações para misturar linhas reais com linhas virtuais, e
  complicaria editar/excluir uma parcela específica. Criando as N linhas reais de uma vez, cada
  parcela é uma `Transaction` comum — nada no resto do sistema precisa mudar.
- **Dinheiro em centavos inteiros, nunca float direto**: tanto a divisão (`amountIsTotal: true`)
  quanto a multiplicação (`amountIsTotal: false`) são feitas em `Math.round`/`Math.floor` sobre
  centavos, convertendo pra string só no final — evita erro de arredondamento acumulado e artefato
  de ponto flutuante mesmo em multiplicação "exata" (ex.: `0.1 * 3` não é `0.3` em JS). O resto da
  divisão não-exata vai inteiro pra última parcela — convenção comum em fatura de cartão real.
- **`date-fns` (`addMonths`) em vez de `Date` nativo**: `Date` nativo tem overflow de mês em fim de
  mês (31/01 + 1 mês não pode virar 03/03). `addMonths` já clampa corretamente pro último dia do
  mês de destino. Confirmado em QA: parcela de 31/01 cai em 28/02 (não bissexto) e volta a 31/03.
- **Checagem de categoria pertencente ao ambiente, nova nesta mutation**: `createTransaction` hoje
  não valida isso (lacuna pré-existente, fora de escopo corrigir ali — mencionado no plano). Mas
  como esta mutation cria até 60 transações de uma vez a partir de uma única categoria informada,
  o impacto de não validar seria maior aqui, então a checagem foi adicionada só na mutation nova.
- **Limite superior de 60 parcelas**: salvaguarda contra erro de digitação (ex.: "1200" em vez de
  "12") virar uma criação em massa de transações numa única chamada.
- **`id` gerado com `crypto.randomUUID()` em vez de deixar o `@default(uuid())` do Prisma gerar**:
  necessário pra poder referenciar `installmentPurchaseId` nas N transações dentro do mesmo array
  de `$transaction` (mesmo padrão já usado em `deleteEnvironment`/`deleteCategory` — atômico, tudo
  ou nada). A alternativa (transação interativa, criando o agrupador e depois cada transação em
  `await` sequencial) foi tentada primeiro e **falhou em QA** com 60 parcelas: o round-trip
  sequencial ao banco (Neon) excedeu o timeout padrão de transação interativa do Prisma
  ("Transaction API error: Transaction not found... refers to an old closed transaction"). A
  correção foi trocar para `$transaction` em array com `transaction.createManyAndReturn` (uma
  única chamada em lote), que resolveu o timeout e manteve a atomicidade.
- **Ordenação explícita do retorno por `installmentNumber`**: `createManyAndReturn` não garante a
  ordem das linhas devolvidas pelo banco — o service ordena antes de devolver, pra quem chama (ex.
  o frontend) poder contar "N parcelas criadas" na ordem certa sem uma query extra.
- **Escopo**: só é possível editar/excluir uma parcela isolada, reaproveitando
  `updateTransaction`/`deleteTransaction` existentes sem nenhuma mudança neles — decisão explícita
  do solicitante para esta v1. Cancelar parcelas futuras em massa ou editar o parcelamento inteiro
  ficam registrados como pendência futura (ver plano).
- **`InstallmentPurchase` pode ficar "órfão"** (zero `Transaction` apontando pra ele) se todas as
  parcelas forem excluídas uma a uma — aceitável nesta tarefa, não há exclusão em massa do plano
  pra se preocupar com isso; débito técnico conhecido, não um bug.
