/**
 * Script de QA para a feature "Pagamento em crédito (parcelamento)" (tarefa 03).
 * Roda contra o servidor GraphQL real (http://localhost:4000/graphql) e o banco real do projeto.
 *
 * Todo dado criado é marcado com o prefixo QA_TAG ("[QA]") em nome/título/descrição, e os
 * e-mails usam o domínio reservado "@test.local" com prefixo "qa-" — mesma convenção das
 * tarefas 01/02 (ver scripts/qa-ambientes-compartilhados.ts, scripts/qa-convite-por-codigo.ts).
 *
 * Por padrão o script NÃO limpa o que cria. Para limpar TODO dado de QA (de qualquer rodada, de
 * qualquer script), rode `npx tsx scripts/qa-cleanup-all.ts --apply`.
 *
 * Uso: npx tsx scripts/qa-pagamento-credito.ts
 *      QA_CLEANUP=true npx tsx scripts/qa-pagamento-credito.ts   (limpa só esta rodada)
 */
import { prismaClient } from "../prisma/prisma";

const ENDPOINT = "http://localhost:4000/graphql";
const RUN_ID = Date.now();
const QA_TAG = "[QA]";
const AUTO_CLEANUP = process.env.QA_CLEANUP === "true";

type GqlResult<T> = { data?: T; errors?: { message: string }[] };

async function gql<T = any>(
  query: string,
  variables: Record<string, unknown>,
  token?: string
): Promise<GqlResult<T>> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(label: string, cond: boolean, extra?: unknown) {
  if (cond) {
    passed++;
    console.log(`  OK  ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.log(`FAIL  ${label}`, extra ?? "");
  }
}

function expectError(label: string, result: GqlResult<unknown>) {
  check(label, Boolean(result.errors?.length), result.data ?? result.errors);
}

function expectOk<T>(label: string, result: GqlResult<T>): T {
  check(`${label} (sem erro)`, !result.errors?.length, result.errors);
  return result.data as T;
}

const REGISTER = `mutation($data: RegisterInput!) { register(data: $data) { token user { id name email } } }`;
const LIST_MY_ENVS = `query { listMyEnvironments { id name isPersonal members { id role displayName userId } } }`;
const CREATE_ENV = `mutation($data: CreateEnvironmentInput!) { createEnvironment(data: $data) { id name isPersonal } }`;
const CREATE_CATEGORY = `mutation($data: CreateCategoryInput!) { createCategory(data: $data) { id title } }`;
const DELETE_CATEGORY = `mutation($id: String!) { deleteCategory(id: $id) { id } }`;
const DELETE_ENV = `mutation($environmentId: String!) { deleteEnvironment(environmentId: $environmentId) }`;
const LIST_TRANSACTIONS = `query($environmentId: String!) { listTransactions(environmentId: $environmentId) { id description amount date installmentPurchaseId installmentNumber categoryId memberId } }`;
const UPDATE_TRANSACTION = `mutation($id: String!, $data: CreateTransactionInput!) { updateTransaction(id: $id, data: $data) { id description amount installmentPurchaseId installmentNumber } }`;
const DELETE_TRANSACTION = `mutation($id: String!) { deleteTransaction(id: $id) { id } }`;
const CREATE_INSTALLMENT_PURCHASE = `mutation($data: CreateInstallmentPurchaseInput!) { createInstallmentPurchase(data: $data) { id description amount date installmentPurchaseId installmentNumber categoryId memberId } }`;

type EnvMember = { id: string; role: string | null; displayName: string | null; userId: string | null };
type Env = { id: string; name: string; isPersonal: boolean; members: EnvMember[] };

async function register(name: string, email: string) {
  const r = expectOk<{ register: { token: string; user: { id: string } } }>(
    `register ${email}`,
    await gql(REGISTER, { data: { name, email, password: "SenhaForte123!" } })
  );
  return { token: r.register.token, userId: r.register.user.id };
}

async function myEnvs(token: string) {
  return expectOk<{ listMyEnvironments: Env[] }>(
    "listMyEnvironments",
    await gql(LIST_MY_ENVS, {}, token)
  ).listMyEnvironments;
}

function findMyMember(env: Env, userId: string) {
  return env.members.find((m) => m.userId === userId)!;
}

async function main() {
  console.log(`\n=== QA Pagamento em Crédito (run ${RUN_ID}) ===\n`);

  const emailA = `qa-${RUN_ID}-a@test.local`;
  const emailB = `qa-${RUN_ID}-b@test.local`;

  console.log("-- Setup: registro de usuários e ambientes --");
  const a = await register(`${QA_TAG} Admin A`, emailA);
  const b = await register(`${QA_TAG} Usuário B`, emailB);

  const personalEnvA = (await myEnvs(a.token))[0]!;
  const memberA = findMyMember(personalEnvA, a.userId);

  const jointEnv = expectOk<{ createEnvironment: Env }>(
    "createEnvironment (A)",
    await gql(CREATE_ENV, { data: { name: `${QA_TAG} Casa Crédito` } }, a.token)
  ).createEnvironment;
  const jointEnvRefreshed = (await myEnvs(a.token)).find((e) => e.id === jointEnv.id)!;
  const memberAInJoint = findMyMember(jointEnvRefreshed, a.userId);

  const category = expectOk<{ createCategory: { id: string } }>(
    "createCategory (A, no ambiente pessoal)",
    await gql(
      CREATE_CATEGORY,
      { data: { title: `${QA_TAG} Eletrônicos`, icon: "x", color: "#000", environmentId: personalEnvA.id } },
      a.token
    )
  ).createCategory;

  const categoryInJointEnv = expectOk<{ createCategory: { id: string } }>(
    "createCategory (A, no ambiente conjunto)",
    await gql(
      CREATE_CATEGORY,
      { data: { title: `${QA_TAG} Mercado`, icon: "x", color: "#000", environmentId: jointEnv.id } },
      a.token
    )
  ).createCategory;

  console.log("\n-- 1. Compra parcelada por valor TOTAL (R$ 1000,00 em 3x) --");
  const total3x = expectOk<{ createInstallmentPurchase: any[] }>(
    "createInstallmentPurchase (total R$1000,00 em 3x)",
    await gql(
      CREATE_INSTALLMENT_PURCHASE,
      {
        data: {
          description: `${QA_TAG} Notebook`,
          type: "expense",
          amount: "1000.00",
          amountIsTotal: true,
          installmentsCount: 3,
          startDate: "2026-01-31T12:00:00.000Z",
          categoryId: category.id,
          environmentId: personalEnvA.id,
          memberId: memberA.id,
        },
      },
      a.token
    )
  ).createInstallmentPurchase;

  check("createInstallmentPurchase (total) retorna 3 transações", total3x.length === 3);
  const sumTotal3x = total3x.reduce((acc, t) => acc + Number(t.amount), 0);
  check("soma das 3 parcelas bate exatamente R$1000,00", Math.abs(sumTotal3x - 1000) < 1e-9, sumTotal3x);
  check(
    "parcela 1 tem description formatada '1/3'",
    total3x[0].description === `${QA_TAG} Notebook 1/3`,
    total3x[0].description
  );
  check(
    "parcela 3 tem description formatada '3/3'",
    total3x[2].description === `${QA_TAG} Notebook 3/3`,
    total3x[2].description
  );
  check(
    "installmentNumber de cada parcela é 1, 2, 3 (nesta ordem de criação)",
    total3x[0].installmentNumber === 1 && total3x[1].installmentNumber === 2 && total3x[2].installmentNumber === 3,
    total3x.map((t) => t.installmentNumber)
  );
  check(
    "todas as 3 parcelas compartilham o mesmo installmentPurchaseId",
    total3x[0].installmentPurchaseId &&
      total3x[0].installmentPurchaseId === total3x[1].installmentPurchaseId &&
      total3x[1].installmentPurchaseId === total3x[2].installmentPurchaseId
  );
  check(
    "data da parcela 1 é 2026-01-31 (mês de início)",
    total3x[0].date.startsWith("2026-01-31"),
    total3x[0].date
  );
  check(
    "data da parcela 2 é 2026-02-28 (fim de mês, ajuste de overflow — não 03/03)",
    total3x[1].date.startsWith("2026-02-28"),
    total3x[1].date
  );
  check(
    "data da parcela 3 é 2026-03-31 (volta ao dia 31, mês com 31 dias)",
    total3x[2].date.startsWith("2026-03-31"),
    total3x[2].date
  );

  const purchaseRow3x = await prismaClient.installmentPurchase.findUnique({
    where: { id: total3x[0].installmentPurchaseId },
  });
  check("InstallmentPurchase.totalAmount persistido é 1000.00", purchaseRow3x?.totalAmount === "1000.00");
  check(
    "InstallmentPurchase.installmentAmount persistido é o valor da parcela SEM o resto (333.33)",
    purchaseRow3x?.installmentAmount === "333.33",
    purchaseRow3x?.installmentAmount
  );
  check(
    "parcela 1/2 têm 333.33 e a última (3) absorve o resto: 333.34",
    total3x[0].amount === "333.33" && total3x[1].amount === "333.33" && total3x[2].amount === "333.34",
    total3x.map((t) => t.amount)
  );

  console.log("\n-- 2. Cada parcela aparece no mês certo em listTransactions (sem lógica nova) --");
  const listAfter3x = expectOk<{ listTransactions: any[] }>(
    "listTransactions (ambiente pessoal de A)",
    await gql(LIST_TRANSACTIONS, { environmentId: personalEnvA.id }, a.token)
  ).listTransactions;
  const monthsOf3x = total3x.map((t) => t.date.slice(0, 7));
  check(
    "as 3 parcelas caem em 3 meses diferentes (jan/fev/mar)",
    new Set(monthsOf3x).size === 3,
    monthsOf3x
  );
  for (const parcela of total3x) {
    const found = listAfter3x.find((t) => t.id === parcela.id);
    check(`parcela ${parcela.description} aparece em listTransactions com a mesma data/valor`, Boolean(found) && found.amount === parcela.amount);
  }

  console.log("\n-- 3. Compra parcelada por valor DA PARCELA (R$ 300,00 x 4 = R$1200,00) --");
  const perInstallment4x = expectOk<{ createInstallmentPurchase: any[] }>(
    "createInstallmentPurchase (valor por parcela R$300,00 x 4)",
    await gql(
      CREATE_INSTALLMENT_PURCHASE,
      {
        data: {
          description: `${QA_TAG} Celular`,
          type: "expense",
          amount: "300.00",
          amountIsTotal: false,
          installmentsCount: 4,
          startDate: "2026-05-15T12:00:00.000Z",
          categoryId: category.id,
          environmentId: personalEnvA.id,
          memberId: memberA.id,
        },
      },
      a.token
    )
  ).createInstallmentPurchase;
  check("createInstallmentPurchase (por parcela) retorna 4 transações", perInstallment4x.length === 4);
  check(
    "todas as 4 parcelas têm exatamente R$300,00 (sem resto a redistribuir)",
    perInstallment4x.every((t) => t.amount === "300.00"),
    perInstallment4x.map((t) => t.amount)
  );
  const purchaseRowPerInstallment = await prismaClient.installmentPurchase.findUnique({
    where: { id: perInstallment4x[0].installmentPurchaseId },
  });
  check(
    "InstallmentPurchase.totalAmount calculado por multiplicação é 1200.00 (sem artefato de float)",
    purchaseRowPerInstallment?.totalAmount === "1200.00",
    purchaseRowPerInstallment?.totalAmount
  );

  console.log("\n-- 4. Validações de negócio --");
  expectError(
    "type inválido é rejeitado",
    await gql(
      CREATE_INSTALLMENT_PURCHASE,
      {
        data: {
          description: `${QA_TAG} Tipo inválido`,
          type: "invalid",
          amount: "100.00",
          amountIsTotal: true,
          installmentsCount: 2,
          startDate: "2026-01-01T00:00:00.000Z",
          categoryId: category.id,
          environmentId: personalEnvA.id,
          memberId: memberA.id,
        },
      },
      a.token
    )
  );

  expectError(
    "usuário sem acesso ao ambiente é rejeitado",
    await gql(
      CREATE_INSTALLMENT_PURCHASE,
      {
        data: {
          description: `${QA_TAG} Sem acesso`,
          type: "expense",
          amount: "100.00",
          amountIsTotal: true,
          installmentsCount: 2,
          startDate: "2026-01-01T00:00:00.000Z",
          categoryId: category.id,
          environmentId: personalEnvA.id,
          memberId: memberA.id,
        },
      },
      b.token
    )
  );

  expectError(
    "memberId de outro ambiente é rejeitado",
    await gql(
      CREATE_INSTALLMENT_PURCHASE,
      {
        data: {
          description: `${QA_TAG} Membro de outro ambiente`,
          type: "expense",
          amount: "100.00",
          amountIsTotal: true,
          installmentsCount: 2,
          startDate: "2026-01-01T00:00:00.000Z",
          categoryId: categoryInJointEnv.id,
          environmentId: jointEnv.id,
          memberId: memberA.id, // memberId pertence ao ambiente pessoal, não ao jointEnv
        },
      },
      a.token
    )
  );

  expectError(
    "categoryId de outro ambiente é rejeitado (achado de revisão do plano)",
    await gql(
      CREATE_INSTALLMENT_PURCHASE,
      {
        data: {
          description: `${QA_TAG} Categoria de outro ambiente`,
          type: "expense",
          amount: "100.00",
          amountIsTotal: true,
          installmentsCount: 2,
          startDate: "2026-01-01T00:00:00.000Z",
          categoryId: category.id, // categoria do ambiente pessoal
          environmentId: jointEnv.id, // mas usada no ambiente conjunto
          memberId: memberAInJoint.id,
        },
      },
      a.token
    )
  );

  console.log("\n-- 5. Limites de installmentsCount (2 a 60) --");
  expectError(
    "installmentsCount = 1 é rejeitado (1x não precisa de parcelamento)",
    await gql(
      CREATE_INSTALLMENT_PURCHASE,
      {
        data: {
          description: `${QA_TAG} 1x`,
          type: "expense",
          amount: "100.00",
          amountIsTotal: true,
          installmentsCount: 1,
          startDate: "2026-01-01T00:00:00.000Z",
          categoryId: category.id,
          environmentId: personalEnvA.id,
          memberId: memberA.id,
        },
      },
      a.token
    )
  );

  expectError(
    "installmentsCount = 61 é rejeitado (acima do máximo)",
    await gql(
      CREATE_INSTALLMENT_PURCHASE,
      {
        data: {
          description: `${QA_TAG} 61x`,
          type: "expense",
          amount: "610.00",
          amountIsTotal: true,
          installmentsCount: 61,
          startDate: "2026-01-01T00:00:00.000Z",
          categoryId: category.id,
          environmentId: personalEnvA.id,
          memberId: memberA.id,
        },
      },
      a.token
    )
  );

  const boundary2x = expectOk<{ createInstallmentPurchase: any[] }>(
    "installmentsCount = 2 (limite inferior) é aceito",
    await gql(
      CREATE_INSTALLMENT_PURCHASE,
      {
        data: {
          description: `${QA_TAG} 2x`,
          type: "expense",
          amount: "20.00",
          amountIsTotal: true,
          installmentsCount: 2,
          startDate: "2026-01-01T00:00:00.000Z",
          categoryId: category.id,
          environmentId: personalEnvA.id,
          memberId: memberA.id,
        },
      },
      a.token
    )
  ).createInstallmentPurchase;
  check("installmentsCount = 2 gerou exatamente 2 transações", boundary2x.length === 2);

  const boundary60x = expectOk<{ createInstallmentPurchase: any[] }>(
    "installmentsCount = 60 (limite superior) é aceito",
    await gql(
      CREATE_INSTALLMENT_PURCHASE,
      {
        data: {
          description: `${QA_TAG} 60x`,
          type: "expense",
          amount: "600.00",
          amountIsTotal: true,
          installmentsCount: 60,
          startDate: "2026-01-01T00:00:00.000Z",
          categoryId: category.id,
          environmentId: personalEnvA.id,
          memberId: memberA.id,
        },
      },
      a.token
    )
  ).createInstallmentPurchase;
  check("installmentsCount = 60 gerou exatamente 60 transações", boundary60x.length === 60);

  console.log("\n-- 6. Valor inválido é rejeitado --");
  expectError(
    "amount não numérico é rejeitado",
    await gql(
      CREATE_INSTALLMENT_PURCHASE,
      {
        data: {
          description: `${QA_TAG} Valor inválido`,
          type: "expense",
          amount: "abc",
          amountIsTotal: true,
          installmentsCount: 2,
          startDate: "2026-01-01T00:00:00.000Z",
          categoryId: category.id,
          environmentId: personalEnvA.id,
          memberId: memberA.id,
        },
      },
      a.token
    )
  );
  expectError(
    "amount <= 0 é rejeitado",
    await gql(
      CREATE_INSTALLMENT_PURCHASE,
      {
        data: {
          description: `${QA_TAG} Valor zero`,
          type: "expense",
          amount: "0",
          amountIsTotal: true,
          installmentsCount: 2,
          startDate: "2026-01-01T00:00:00.000Z",
          categoryId: category.id,
          environmentId: personalEnvA.id,
          memberId: memberA.id,
        },
      },
      a.token
    )
  );

  console.log("\n-- 7. Editar/excluir uma parcela isolada reaproveita updateTransaction/deleteTransaction --");
  const parcelaParaEditar = total3x[0];
  const updated = expectOk<{ updateTransaction: any }>(
    "updateTransaction numa parcela isolada",
    await gql(
      UPDATE_TRANSACTION,
      {
        id: parcelaParaEditar.id,
        data: {
          type: "expense",
          description: `${QA_TAG} Notebook 1/3 (editado)`,
          amount: parcelaParaEditar.amount,
          date: parcelaParaEditar.date,
          categoryId: parcelaParaEditar.categoryId,
          environmentId: personalEnvA.id,
          memberId: parcelaParaEditar.memberId,
        },
      },
      a.token
    )
  ).updateTransaction;
  check(
    "updateTransaction edita a descrição livremente (não é bloqueado por ser parcela)",
    updated.description === `${QA_TAG} Notebook 1/3 (editado)`
  );
  check(
    "installmentPurchaseId/installmentNumber continuam preservados após updateTransaction",
    updated.installmentPurchaseId === parcelaParaEditar.installmentPurchaseId &&
      updated.installmentNumber === 1
  );

  const parcelaParaExcluir = total3x[1];
  const deleted = expectOk<{ deleteTransaction: any }>(
    "deleteTransaction numa parcela isolada",
    await gql(DELETE_TRANSACTION, { id: parcelaParaExcluir.id }, a.token)
  ).deleteTransaction;
  check("deleteTransaction exclui a parcela normalmente", deleted.id === parcelaParaExcluir.id);
  const purchaseAfterPartialDelete = await prismaClient.installmentPurchase.findUnique({
    where: { id: parcelaParaExcluir.installmentPurchaseId },
  });
  check(
    "InstallmentPurchase sobrevive à exclusão de uma parcela isolada (não cascateia pro agrupador)",
    Boolean(purchaseAfterPartialDelete)
  );

  console.log("\n-- 8. Excluir a categoria usada não deixa InstallmentPurchase órfão nem quebra FK --");
  const categoryForDeleteTest = expectOk<{ createCategory: { id: string } }>(
    "createCategory (dedicada ao teste de exclusão)",
    await gql(
      CREATE_CATEGORY,
      { data: { title: `${QA_TAG} Categoria Descartável`, icon: "x", color: "#000", environmentId: personalEnvA.id } },
      a.token
    )
  ).createCategory;
  const purchaseForCategoryDelete = expectOk<{ createInstallmentPurchase: any[] }>(
    "createInstallmentPurchase (usando a categoria descartável)",
    await gql(
      CREATE_INSTALLMENT_PURCHASE,
      {
        data: {
          description: `${QA_TAG} Compra categoria descartável`,
          type: "expense",
          amount: "90.00",
          amountIsTotal: true,
          installmentsCount: 3,
          startDate: "2026-06-01T00:00:00.000Z",
          categoryId: categoryForDeleteTest.id,
          environmentId: personalEnvA.id,
          memberId: memberA.id,
        },
      },
      a.token
    )
  ).createInstallmentPurchase;
  const installmentPurchaseIdForCategoryDelete = purchaseForCategoryDelete[0].installmentPurchaseId;

  expectOk("deleteCategory (categoria descartável, com InstallmentPurchase vinculado)", await gql(DELETE_CATEGORY, { id: categoryForDeleteTest.id }, a.token));
  const purchaseRowAfterCategoryDelete = await prismaClient.installmentPurchase.findUnique({
    where: { id: installmentPurchaseIdForCategoryDelete },
  });
  check(
    "InstallmentPurchase foi removido junto com a categoria (sem órfão, sem erro de FK)",
    purchaseRowAfterCategoryDelete === null
  );
  const transactionsAfterCategoryDelete = await prismaClient.transaction.findMany({
    where: { installmentPurchaseId: installmentPurchaseIdForCategoryDelete },
  });
  check(
    "as transações da compra também foram removidas (deleteCategory já apaga Transaction por categoryId)",
    transactionsAfterCategoryDelete.length === 0
  );

  console.log("\n-- 9. Excluir o ambiente usado não deixa InstallmentPurchase órfão nem quebra FK --");
  const envForDeleteTest = expectOk<{ createEnvironment: Env }>(
    "createEnvironment (dedicado ao teste de exclusão)",
    await gql(CREATE_ENV, { data: { name: `${QA_TAG} Ambiente Descartável` } }, a.token)
  ).createEnvironment;
  const categoryInEnvForDelete = expectOk<{ createCategory: { id: string } }>(
    "createCategory (no ambiente descartável)",
    await gql(
      CREATE_CATEGORY,
      { data: { title: `${QA_TAG} Categoria Env Descartável`, icon: "x", color: "#000", environmentId: envForDeleteTest.id } },
      a.token
    )
  ).createCategory;
  const envForDeleteRefreshed = (await myEnvs(a.token)).find((e) => e.id === envForDeleteTest.id)!;
  const memberInEnvForDelete = findMyMember(envForDeleteRefreshed, a.userId);

  const purchaseForEnvDelete = expectOk<{ createInstallmentPurchase: any[] }>(
    "createInstallmentPurchase (no ambiente descartável)",
    await gql(
      CREATE_INSTALLMENT_PURCHASE,
      {
        data: {
          description: `${QA_TAG} Compra ambiente descartável`,
          type: "expense",
          amount: "60.00",
          amountIsTotal: true,
          installmentsCount: 3,
          startDate: "2026-06-01T00:00:00.000Z",
          categoryId: categoryInEnvForDelete.id,
          environmentId: envForDeleteTest.id,
          memberId: memberInEnvForDelete.id,
        },
      },
      a.token
    )
  ).createInstallmentPurchase;
  const installmentPurchaseIdForEnvDelete = purchaseForEnvDelete[0].installmentPurchaseId;

  expectOk("deleteEnvironment (ambiente descartável, com InstallmentPurchase vinculado)", await gql(DELETE_ENV, { environmentId: envForDeleteTest.id }, a.token));
  const purchaseRowAfterEnvDelete = await prismaClient.installmentPurchase.findUnique({
    where: { id: installmentPurchaseIdForEnvDelete },
  });
  check(
    "InstallmentPurchase foi removido junto com o ambiente (sem órfão, sem erro de FK)",
    purchaseRowAfterEnvDelete === null
  );
  const envRowGone = await prismaClient.environment.findUnique({ where: { id: envForDeleteTest.id } });
  check("ambiente foi realmente excluído do banco", envRowGone === null);

  console.log(`\n=== RESULTADO: ${passed} OK / ${failed} FAIL ===`);
  if (failures.length) {
    console.log("Falhas:", failures);
  }
}

async function cleanup(userIds: string[]) {
  console.log("\n-- Limpeza dos dados desta rodada (QA_CLEANUP=true) --");
  const envs = await prismaClient.environment.findMany({
    where: { OR: [{ name: { startsWith: QA_TAG } }, { members: { some: { userId: { in: userIds } } } }] },
  });
  for (const env of envs) {
    await prismaClient.transaction.deleteMany({ where: { environmentId: env.id } });
    await prismaClient.installmentPurchase.deleteMany({ where: { environmentId: env.id } });
    await prismaClient.category.deleteMany({ where: { environmentId: env.id } });
    await prismaClient.environmentMember.deleteMany({ where: { environmentId: env.id } });
    await prismaClient.environmentInviteCode.deleteMany({ where: { environmentId: env.id } });
    if (!env.isPersonal) {
      await prismaClient.environment.delete({ where: { id: env.id } });
    }
  }
  await prismaClient.user.deleteMany({ where: { id: { in: userIds } } });
  console.log(`Removidos: ${userIds.length} usuários de teste, ${envs.length} ambiente(s) relacionados.`);
}

main()
  .catch((err) => {
    failed++;
    failures.push(`Erro inesperado: ${err?.message ?? err}`);
    console.error(err);
  })
  .finally(async () => {
    const testUsers = await prismaClient.user.findMany({
      where: { email: { contains: `qa-${RUN_ID}-` } },
      select: { id: true },
    });

    if (AUTO_CLEANUP) {
      await cleanup(testUsers.map((u) => u.id));
    } else {
      console.log(
        `\n-- Dados desta rodada NÃO foram removidos (padrão atual). --\n` +
          `Usuários criados: ${testUsers.map((u) => u.id).join(", ") || "(nenhum)"}\n` +
          `Tudo que esta rodada criou tem o prefixo "${QA_TAG}" em nome/título/descrição e o ` +
          `e-mail "qa-${RUN_ID}-...@test.local". Pra limpar só esta rodada agora, rode de novo ` +
          `com QA_CLEANUP=true. Pra limpar TODO dado de QA (de qualquer rodada) de uma vez, antes ` +
          `de ir pra produção, rode: npx tsx scripts/qa-cleanup-all.ts --apply`
      );
    }

    await prismaClient.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  });
