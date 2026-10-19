/**
 * Script de QA para a feature "Convite por código" (tarefa 02).
 * Roda contra o servidor GraphQL real (http://localhost:4000/graphql) e o banco real do projeto.
 *
 * Todo dado criado é marcado com o prefixo QA_TAG ("[QA]") em nome/título/descrição, e os
 * e-mails usam o domínio reservado "@test.local" com prefixo "qa-" — mesma convenção da tarefa 01
 * (ver scripts/qa-ambientes-compartilhados.ts).
 *
 * Por padrão o script NÃO limpa o que cria. Para limpar TODO dado de QA (de qualquer rodada, de
 * qualquer script), rode `npx tsx scripts/qa-cleanup-all.ts --apply`.
 *
 * Uso: npx tsx scripts/qa-convite-por-codigo.ts
 *      QA_CLEANUP=true npx tsx scripts/qa-convite-por-codigo.ts   (limpa só esta rodada)
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
const LIST_MY_ENVS = `query { listMyEnvironments { id name isPersonal members { id role displayName userId user { id name } } } }`;
const CREATE_ENV = `mutation($data: CreateEnvironmentInput!) { createEnvironment(data: $data) { id name isPersonal } }`;
const GENERATE_CODE = `mutation($environmentId: String!) { generateEnvironmentInviteCode(environmentId: $environmentId) { environmentId code expiresAt createdAt } }`;
const GET_CURRENT_CODE = `query($environmentId: String!) { getCurrentInviteCode(environmentId: $environmentId) { environmentId code expiresAt } }`;
const GET_ENV_BY_CODE = `query($code: String!) { getEnvironmentByInviteCode(code: $code) { id name isPersonal } }`;
const GET_ENV_BY_CODE_WITH_MEMBERS = `query($code: String!) { getEnvironmentByInviteCode(code: $code) { id name members { id role } } }`;
const JOIN_BY_CODE = `mutation($code: String!) { joinEnvironmentByCode(code: $code) { id name } }`;
const APPROVE_MEMBER = `mutation($environmentId: String!, $memberId: String!) { approveMember(environmentId: $environmentId, memberId: $memberId) { id role } }`;
const PROMOTE_TO_ADMIN = `mutation($environmentId: String!, $memberId: String!) { promoteToAdmin(environmentId: $environmentId, memberId: $memberId) { id role } }`;
const REMOVE_MEMBER = `mutation($environmentId: String!, $memberId: String!) { removeMember(environmentId: $environmentId, memberId: $memberId) { id removedAt } }`;
const LEAVE_ENV = `mutation($environmentId: String!, $newAdminMemberId: String) { leaveEnvironment(environmentId: $environmentId, newAdminMemberId: $newAdminMemberId) }`;
const DELETE_ENV = `mutation($environmentId: String!) { deleteEnvironment(environmentId: $environmentId) }`;
const CREATE_CATEGORY = `mutation($data: CreateCategoryInput!) { createCategory(data: $data) { id title } }`;
const LIST_CATEGORIES = `query($environmentId: String!) { listCategories(environmentId: $environmentId) { id title } }`;
const CREATE_TRANSACTION = `mutation($data: CreateTransactionInput!) { createTransaction(data: $data) { id amount memberId } }`;
const PENDING_MEMBERS = `query { listMyEnvironments { id pendingMembers { id role userId } } }`;

type EnvMember = {
  id: string;
  role: string | null;
  displayName: string | null;
  userId: string | null;
  user: { id: string; name: string } | null;
};
type Env = { id: string; name: string; isPersonal: boolean; members: EnvMember[] };

async function register(name: string, email: string) {
  const r = expectOk<{ register: { token: string; user: { id: string } } }>(
    `register ${email}`,
    await gql(REGISTER, { data: { name, email, password: "SenhaForte123!" } })
  );
  return { token: r.register.token, userId: r.register.user.id };
}

function findMyMember(env: Env, userId: string) {
  return env.members.find((m) => m.userId === userId);
}

async function myEnvs(token: string) {
  return expectOk<{ listMyEnvironments: Env[] }>(
    "listMyEnvironments",
    await gql(LIST_MY_ENVS, {}, token)
  ).listMyEnvironments;
}

async function main() {
  console.log(`\n=== QA Convite por Código (run ${RUN_ID}) ===\n`);

  const emailA = `qa-${RUN_ID}-a@test.local`;
  const emailB = `qa-${RUN_ID}-b@test.local`;
  const emailC = `qa-${RUN_ID}-c@test.local`;

  console.log("-- Setup: registro de usuários de teste --");
  const a = await register(`${QA_TAG} Admin A`, emailA);
  const b = await register(`${QA_TAG} Usuário B`, emailB);
  const c = await register(`${QA_TAG} Usuário C`, emailC);

  const personalEnvA = (await myEnvs(a.token))[0]!;

  console.log("\n-- 1. generateEnvironmentInviteCode é bloqueado no ambiente pessoal --");
  expectError(
    "generateEnvironmentInviteCode no ambiente pessoal é rejeitado",
    await gql(GENERATE_CODE, { environmentId: personalEnvA.id }, a.token)
  );

  console.log("\n-- 2. Criação de ambiente conjunto + geração de código --");
  const createdEnv = expectOk<{ createEnvironment: Env }>(
    "createEnvironment",
    await gql(CREATE_ENV, { data: { name: `${QA_TAG} Casa Código` } }, a.token)
  ).createEnvironment;
  const envId = createdEnv.id;

  const nonAdminAttempt = await gql(GENERATE_CODE, { environmentId: envId }, b.token);
  expectError("generateEnvironmentInviteCode por não-membro é rejeitado", nonAdminAttempt);

  const code1 = expectOk<{ generateEnvironmentInviteCode: any }>(
    "generateEnvironmentInviteCode (A, admin)",
    await gql(GENERATE_CODE, { environmentId: envId }, a.token)
  ).generateEnvironmentInviteCode;
  check("código gerado tem 8 caracteres", code1.code.length === 8);
  check("código gerado aponta pro ambiente certo", code1.environmentId === envId);

  console.log("\n-- 3. getCurrentInviteCode (Admin only, só leitura) --");
  const current1 = expectOk<{ getCurrentInviteCode: any }>(
    "getCurrentInviteCode (A)",
    await gql(GET_CURRENT_CODE, { environmentId: envId }, a.token)
  ).getCurrentInviteCode;
  check("getCurrentInviteCode retorna o código recém-gerado, sem substituí-lo", current1.code === code1.code);
  expectError(
    "getCurrentInviteCode por não-admin é rejeitado",
    await gql(GET_CURRENT_CODE, { environmentId: envId }, b.token)
  );

  console.log("\n-- 4. Gerar um código novo invalida o anterior (upsert, nunca duplica) --");
  const code2 = expectOk<{ generateEnvironmentInviteCode: any }>(
    "generateEnvironmentInviteCode (segunda geração)",
    await gql(GENERATE_CODE, { environmentId: envId }, a.token)
  ).generateEnvironmentInviteCode;
  check("segundo código é diferente do primeiro", code2.code !== code1.code);
  const codeRowsForEnv = await prismaClient.environmentInviteCode.findMany({
    where: { environmentId: envId },
  });
  check("existe exatamente 1 linha de EnvironmentInviteCode para este ambiente", codeRowsForEnv.length === 1);
  const oldCodeLookup = await gql(GET_ENV_BY_CODE, { code: code1.code }, b.token);
  expectError("código antigo (substituído) não é mais válido", oldCodeLookup);

  console.log("\n-- 5. getEnvironmentByInviteCode é um preview sem efeito colateral --");
  const preview = expectOk<{ getEnvironmentByInviteCode: Env }>(
    "getEnvironmentByInviteCode (B, preview, normalizado com espaço/minúsculo)",
    await gql(GET_ENV_BY_CODE, { code: `  ${code2.code.toLowerCase()}  ` }, b.token)
  ).getEnvironmentByInviteCode;
  check("preview retorna o ambiente certo", preview.id === envId);
  const membershipAfterPreview = await prismaClient.environmentMember.findFirst({
    where: { environmentId: envId, userId: b.userId },
  });
  check("preview não cria nenhum EnvironmentMember (sem efeito colateral)", membershipAfterPreview === null);

  console.log("\n-- 6. Vazamento de PII: members/pendingMembers via preview exigem acesso próprio --");
  // members é nullable de propósito (ver EnvironmentModel) — devolve null (sem PII, sem erro) em
  // vez de lançar, pois o mesmo field resolver também precisa funcionar para quem está "pending"
  // dentro de listMyEnvironments (ver passo 7/9).
  const previewMembersLeak = expectOk<{ getEnvironmentByInviteCode: any }>(
    "getEnvironmentByInviteCode { members } por quem ainda não é membro",
    await gql(GET_ENV_BY_CODE_WITH_MEMBERS, { code: code2.code }, b.token)
  ).getEnvironmentByInviteCode;
  check(
    "members vem null pra quem ainda não é membro (sem vazar PII)",
    previewMembersLeak.members === null,
    previewMembersLeak
  );

  console.log("\n-- 7. joinEnvironmentByCode entra como pending, nunca direto como user --");
  const joined = expectOk<{ joinEnvironmentByCode: Env }>(
    "joinEnvironmentByCode (B)",
    await gql(JOIN_BY_CODE, { code: code2.code }, b.token)
  ).joinEnvironmentByCode;
  check("joinEnvironmentByCode retorna o ambiente certo", joined.id === envId);

  const envsB1 = await myEnvs(b.token);
  check("B vê o ambiente em listMyEnvironments mesmo pending", envsB1.some((e) => e.id === envId));

  console.log("\n-- 8. pending não aparece em members (lista geral) --");
  const envWithMembers = expectOk<{ getEnvironmentByInviteCode: any }>(
    "getEnvironmentByInviteCode (A, já é admin, preview com members)",
    await gql(
      `query($code: String!) { getEnvironmentByInviteCode(code: $code) { id members { id role userId } } }`,
      { code: code2.code },
      a.token
    )
  ).getEnvironmentByInviteCode;
  check(
    "B (pending) não aparece em members (visto por A, que já é membro ativo)",
    !envWithMembers.members.some((m: EnvMember) => m.userId === b.userId)
  );

  console.log("\n-- 9. pendingMembers é Admin only e mostra B --");
  const pendingAsAdmin = expectOk<{ listMyEnvironments: any[] }>(
    "listMyEnvironments { pendingMembers } (A, admin)",
    await gql(PENDING_MEMBERS, {}, a.token)
  ).listMyEnvironments;
  const jointForAWithPending = pendingAsAdmin.find((e) => e.id === envId);
  check(
    "pendingMembers (visto por A) inclui B",
    jointForAWithPending?.pendingMembers?.some((m: EnvMember) => m.userId === b.userId)
  );

  console.log("\n-- 10. pending é bloqueado de Category/Transaction (assertEnvironmentAccess) --");
  const categoryByPending = await gql(
    CREATE_CATEGORY,
    { data: { title: `${QA_TAG} Categoria de B`, icon: "x", color: "#000", environmentId: envId } },
    b.token
  );
  expectError("createCategory por membro pending é bloqueado", categoryByPending);
  const listCategoriesByPending = await gql(LIST_CATEGORIES, { environmentId: envId }, b.token);
  expectError("listCategories por membro pending é bloqueado", listCategoriesByPending);

  console.log("\n-- 11. pending não pode ser promovido a admin direto --");
  const bMemberRow = await prismaClient.environmentMember.findFirst({
    where: { environmentId: envId, userId: b.userId },
  });
  expectError(
    "promoteToAdmin(pending) é rejeitado",
    await gql(PROMOTE_TO_ADMIN, { environmentId: envId, memberId: bMemberRow!.id }, a.token)
  );

  console.log("\n-- 12. pending não pode ser memberId de uma transação --");
  const category = expectOk<{ createCategory: { id: string } }>(
    "createCategory (A, admin)",
    await gql(
      CREATE_CATEGORY,
      { data: { title: `${QA_TAG} Mercado`, icon: "x", color: "#000", environmentId: envId } },
      a.token
    )
  ).createCategory;
  const txToPendingAttempt = await gql(
    CREATE_TRANSACTION,
    {
      data: {
        type: "expense",
        description: `${QA_TAG} tx pra pending (deve falhar)`,
        amount: "10.00",
        date: new Date().toISOString(),
        categoryId: category.id,
        environmentId: envId,
        memberId: bMemberRow!.id,
      },
    },
    a.token
  );
  expectError("createTransaction com memberId pending é rejeitada", txToPendingAttempt);

  console.log("\n-- 13. approveMember aprova pending -> user --");
  const approved = expectOk<{ approveMember: EnvMember }>(
    "approveMember (A aprova B)",
    await gql(APPROVE_MEMBER, { environmentId: envId, memberId: bMemberRow!.id }, a.token)
  ).approveMember;
  check("B agora é user", approved.role === "user");

  expectError(
    "approveMember de novo (já aprovado) é rejeitado",
    await gql(APPROVE_MEMBER, { environmentId: envId, memberId: bMemberRow!.id }, a.token)
  );

  console.log("\n-- 14. Depois de aprovado, B tem acesso normal e pode ser memberId --");
  const txToApprovedB = expectOk<{ createTransaction: any }>(
    "createTransaction com memberId de B (já aprovado)",
    await gql(
      CREATE_TRANSACTION,
      {
        data: {
          type: "expense",
          description: `${QA_TAG} tx pra B aprovado`,
          amount: "15.00",
          date: new Date().toISOString(),
          categoryId: category.id,
          environmentId: envId,
          memberId: bMemberRow!.id,
        },
      },
      a.token
    )
  ).createTransaction;
  check("transação atribuída a B aprovado", txToApprovedB.memberId === bMemberRow!.id);

  const nowPromote = expectOk<{ promoteToAdmin: EnvMember }>(
    "promoteToAdmin(B) agora que é user",
    await gql(PROMOTE_TO_ADMIN, { environmentId: envId, memberId: bMemberRow!.id }, a.token)
  ).promoteToAdmin;
  check("B agora é admin", nowPromote.role === "admin");

  console.log("\n-- 15. Achado crítico: reusar o código não rebaixa quem já é membro ativo --");
  const codeForReuse = expectOk<{ generateEnvironmentInviteCode: any }>(
    "generateEnvironmentInviteCode (nova rodada, pra teste de reuso)",
    await gql(GENERATE_CODE, { environmentId: envId }, a.token)
  ).generateEnvironmentInviteCode;

  const bRejoin = expectOk<{ joinEnvironmentByCode: Env }>(
    "joinEnvironmentByCode (B, já é admin, reusa o código)",
    await gql(JOIN_BY_CODE, { code: codeForReuse.code }, b.token)
  ).joinEnvironmentByCode;
  check("joinEnvironmentByCode (no-op) retorna o ambiente certo", bRejoin.id === envId);

  const bRowAfterReuse = await prismaClient.environmentMember.findFirst({
    where: { environmentId: envId, userId: b.userId },
  });
  check(
    "B continua admin depois de reusar o código (não foi rebaixado a pending)",
    bRowAfterReuse?.role === "admin",
    bRowAfterReuse
  );

  const aRejoin = expectOk<{ joinEnvironmentByCode: Env }>(
    "joinEnvironmentByCode (A, já é admin original, reusa o código)",
    await gql(JOIN_BY_CODE, { code: codeForReuse.code }, a.token)
  ).joinEnvironmentByCode;
  check("joinEnvironmentByCode (A, no-op) retorna o ambiente certo", aRejoin.id === envId);
  const aRowAfterReuse = await prismaClient.environmentMember.findFirst({
    where: { environmentId: envId, userId: a.userId },
  });
  check("A continua admin depois de reusar o código", aRowAfterReuse?.role === "admin", aRowAfterReuse);

  console.log("\n-- 16. Código expirado não funciona (expiração lazy) --");
  await prismaClient.environmentInviteCode.update({
    where: { environmentId: envId },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  expectError(
    "getEnvironmentByInviteCode com código expirado é rejeitado",
    await gql(GET_ENV_BY_CODE, { code: codeForReuse.code }, c.token)
  );
  expectError(
    "joinEnvironmentByCode com código expirado é rejeitado",
    await gql(JOIN_BY_CODE, { code: codeForReuse.code }, c.token)
  );
  const currentAfterExpiry = expectOk<{ getCurrentInviteCode: any }>(
    "getCurrentInviteCode com código expirado",
    await gql(GET_CURRENT_CODE, { environmentId: envId }, a.token)
  ).getCurrentInviteCode;
  check("getCurrentInviteCode trata expirado como null (sem código ativo)", currentAfterExpiry === null);

  console.log("\n-- 17. Código inválido/inexistente é rejeitado --");
  expectError(
    "getEnvironmentByInviteCode com código inexistente é rejeitado",
    await gql(GET_ENV_BY_CODE, { code: "ZZZZZZZZ" }, c.token)
  );

  console.log("\n-- 18. deleteEnvironment é bloqueado com pending pendente de decisão --");
  const codeForC = expectOk<{ generateEnvironmentInviteCode: any }>(
    "generateEnvironmentInviteCode (nova geração, pra C entrar)",
    await gql(GENERATE_CODE, { environmentId: envId }, a.token)
  ).generateEnvironmentInviteCode;
  await gql(JOIN_BY_CODE, { code: codeForC.code }, c.token);

  // Remove B (admin) e volta ambiente a só A ativo + C pending, pra isolar o teste da exclusão.
  const bRowForRemoval = await prismaClient.environmentMember.findFirst({
    where: { environmentId: envId, userId: b.userId },
  });
  expectOk(
    "removeMember(B) (fica só A ativo + C pending)",
    await gql(REMOVE_MEMBER, { environmentId: envId, memberId: bRowForRemoval!.id }, a.token)
  );

  const deleteWithPendingAttempt = await gql(DELETE_ENV, { environmentId: envId }, a.token);
  expectError("deleteEnvironment bloqueado enquanto C está pending", deleteWithPendingAttempt);

  console.log("\n-- 19. pending pode sair livremente (leaveEnvironment usa checagem ampla) --");
  const cRowForLeave = await prismaClient.environmentMember.findFirst({
    where: { environmentId: envId, userId: c.userId },
  });
  expectOk(
    "leaveEnvironment (C, pending, sai sem problema)",
    await gql(LEAVE_ENV, { environmentId: envId, newAdminMemberId: null }, c.token)
  );
  const cRowAfterLeave = await prismaClient.environmentMember.findUnique({
    where: { id: cRowForLeave!.id },
  });
  check("C foi soft-deletado ao sair", Boolean(cRowAfterLeave?.removedAt));

  console.log("\n-- 20. Agora sem pending, exclusão do ambiente funciona (só A ativo) --");
  expectOk("deleteEnvironment (só A ativo, sem pending)", await gql(DELETE_ENV, { environmentId: envId }, a.token));
  const envGone = await prismaClient.environment.findUnique({ where: { id: envId } });
  check("ambiente foi realmente excluído do banco", envGone === null);
  const codeGone = await prismaClient.environmentInviteCode.findUnique({ where: { environmentId: envId } });
  check("EnvironmentInviteCode cascateou com o ambiente", codeGone === null);

  console.log(`\n=== RESULTADO: ${passed} OK / ${failed} FAIL ===`);
  if (failures.length) {
    console.log("Falhas:", failures);
  }
}

async function cleanup(userIds: string[]) {
  console.log("\n-- Limpeza dos dados desta rodada (QA_CLEANUP=true) --");
  await prismaClient.user.deleteMany({ where: { id: { in: userIds } } });
  const orphanEnvs = await prismaClient.environment.findMany({
    where: { name: { startsWith: `${QA_TAG} Casa Código` } },
  });
  for (const env of orphanEnvs) {
    await prismaClient.transaction.deleteMany({ where: { environmentId: env.id } });
    await prismaClient.category.deleteMany({ where: { environmentId: env.id } });
    await prismaClient.environmentMember.deleteMany({ where: { environmentId: env.id } });
    await prismaClient.environmentInviteCode.deleteMany({ where: { environmentId: env.id } });
    await prismaClient.environment.delete({ where: { id: env.id } });
  }
  console.log(`Removidos: ${userIds.length} usuários de teste, ${orphanEnvs.length} ambiente(s) órfão(s).`);
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
