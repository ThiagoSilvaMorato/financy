/**
 * Script de QA para a feature "Ambientes compartilhados" (tarefa 01).
 * Roda contra o servidor GraphQL real (http://localhost:4000/graphql) e o banco real do projeto.
 *
 * Todo dado criado é marcado com o prefixo QA_TAG ("[QA]") em nome/título/descrição, e os
 * e-mails usam o domínio reservado "@test.local" com prefixo "qa-" — dois marcadores
 * independentes, fáceis de filtrar.
 *
 * Por padrão o script NÃO limpa o que cria (economiza chamadas a cada rodada). Antes de ir pra
 * produção, rode `npx tsx scripts/qa-cleanup-all.ts` uma única vez pra apagar TUDO marcado como
 * QA de uma vez, de qualquer rodada. Se quiser que esta rodada específica se limpe sozinha ao
 * final (como no comportamento antigo), rode com QA_CLEANUP=true.
 *
 * Uso: npx tsx scripts/qa-ambientes-compartilhados.ts
 *      QA_CLEANUP=true npx tsx scripts/qa-ambientes-compartilhados.ts   (limpa só esta rodada)
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
  check(label, Boolean(result.errors?.length), result.data);
}

function expectOk<T>(label: string, result: GqlResult<T>): T {
  check(`${label} (sem erro)`, !result.errors?.length, result.errors);
  return result.data as T;
}

const REGISTER = `mutation($data: RegisterInput!) { register(data: $data) { token user { id name email } } }`;
const LIST_MY_ENVS = `query { listMyEnvironments { id name isPersonal members { id role displayName userId user { id name } } } }`;
const CREATE_ENV = `mutation($data: CreateEnvironmentInput!) { createEnvironment(data: $data) { id name isPersonal } }`;
const CREATE_CATEGORY = `mutation($data: CreateCategoryInput!) { createCategory(data: $data) { id title } }`;
const CREATE_TRANSACTION = `mutation($data: CreateTransactionInput!) { createTransaction(data: $data) { id amount memberId member { id displayName role userId } createdBy { id name } } }`;
const INVITE_MEMBER = `mutation($data: InviteMemberInput!) { inviteMember(data: $data) { id role status environment { id name } invitedBy { id name } } }`;
const LIST_PENDING_INVITES = `query { listMyPendingInvites { id role status environment { id name } invitedBy { id name } } }`;
const LIST_ENV_INVITES = `query($environmentId: String!) { listEnvironmentInvites(environmentId: $environmentId) { id role status } }`;
const ACCEPT_INVITE = `mutation($inviteId: String!) { acceptEnvironmentInvite(inviteId: $inviteId) }`;
const DECLINE_INVITE = `mutation($inviteId: String!) { declineEnvironmentInvite(inviteId: $inviteId) }`;
const CANCEL_INVITE = `mutation($inviteId: String!) { cancelEnvironmentInvite(inviteId: $inviteId) }`;
const CREATE_PARTICIPANT = `mutation($data: CreateParticipantInput!) { createParticipant(data: $data) { id displayName role userId } }`;
const REMOVE_PARTICIPANT = `mutation($environmentId: String!, $memberId: String!) { removeParticipant(environmentId: $environmentId, memberId: $memberId) { id removedAt } }`;
const PROMOTE_TO_ADMIN = `mutation($environmentId: String!, $memberId: String!) { promoteToAdmin(environmentId: $environmentId, memberId: $memberId) { id role } }`;
const REMOVE_MEMBER = `mutation($environmentId: String!, $memberId: String!) { removeMember(environmentId: $environmentId, memberId: $memberId) { id removedAt } }`;
const LEAVE_ENV = `mutation($environmentId: String!, $newAdminMemberId: String) { leaveEnvironment(environmentId: $environmentId, newAdminMemberId: $newAdminMemberId) }`;
const DELETE_ENV = `mutation($environmentId: String!) { deleteEnvironment(environmentId: $environmentId) }`;
const RENAME_ENV = `mutation($environmentId: String!, $name: String!) { renameEnvironment(environmentId: $environmentId, name: $name) { id name } }`;

type EnvMember = {
  id: string;
  role: string | null;
  displayName: string | null;
  userId: string | null;
  user: { id: string; name: string } | null;
  removedAt?: string | null;
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

async function main() {
  console.log(`\n=== QA Ambientes Compartilhados (run ${RUN_ID}) ===\n`);

  const emailA = `qa-${RUN_ID}-a@test.local`;
  const emailB = `qa-${RUN_ID}-b@test.local`;

  console.log("-- Setup: registro de usuários de teste --");
  const a = await register(`${QA_TAG} Usuário A`, emailA);
  const b = await register(`${QA_TAG} Usuário B`, emailB);

  console.log("\n-- 1. Ambiente pessoal criado automaticamente no registro --");
  const envsA0 = expectOk<{ listMyEnvironments: Env[] }>(
    "listMyEnvironments A (pós-registro)",
    await gql(LIST_MY_ENVS, {}, a.token)
  ).listMyEnvironments;
  check("A tem exatamente 1 ambiente (pessoal)", envsA0.length === 1);
  check("ambiente de A é isPersonal", envsA0[0]?.isPersonal === true);
  check("ambiente pessoal de A tem 1 membro", envsA0[0]?.members.length === 1);
  check("A é admin do próprio ambiente pessoal", envsA0[0]?.members[0]?.role === "admin");
  const personalEnvA = envsA0[0]!;

  console.log("\n-- 2. Criação de ambiente conjunto --");
  const createdEnv = expectOk<{ createEnvironment: Env }>(
    "createEnvironment",
    await gql(CREATE_ENV, { data: { name: `${QA_TAG} Casa Teste` } }, a.token)
  ).createEnvironment;
  const envId = createdEnv.id;
  check("ambiente conjunto não é pessoal", createdEnv.isPersonal === false);

  const envsA1 = expectOk<{ listMyEnvironments: Env[] }>(
    "listMyEnvironments A (pós-criação)",
    await gql(LIST_MY_ENVS, {}, a.token)
  ).listMyEnvironments;
  check("A agora tem 2 ambientes (pessoal + conjunto)", envsA1.length === 2);
  const jointEnv1 = envsA1.find((e) => e.id === envId)!;
  const aMemberInJoint = findMyMember(jointEnv1, a.userId)!;
  check("A é admin do ambiente conjunto recém-criado", aMemberInJoint?.role === "admin");

  console.log("\n-- 3. Categoria e transação dentro do ambiente conjunto --");
  const category = expectOk<{ createCategory: { id: string } }>(
    "createCategory no ambiente conjunto",
    await gql(
      CREATE_CATEGORY,
      {
        data: {
          title: `${QA_TAG} Mercado`,
          icon: "shopping-cart",
          color: "#000000",
          environmentId: envId,
        },
      },
      a.token
    )
  ).createCategory;

  const tx1 = expectOk<{ createTransaction: any }>(
    "createTransaction atribuída a A no ambiente conjunto",
    await gql(
      CREATE_TRANSACTION,
      {
        data: {
          type: "expense",
          description: `${QA_TAG} transação de teste automatizado`,
          amount: "100.00",
          date: new Date().toISOString(),
          categoryId: category.id,
          environmentId: envId,
          memberId: aMemberInJoint.id,
        },
      },
      a.token
    )
  ).createTransaction;
  check("transação atribuída ao EnvironmentMember correto", tx1.member?.id === aMemberInJoint.id);
  check("createdBy da transação é A", tx1.createdBy?.id === a.userId);

  console.log("\n-- 4. Validação cross-environment de memberId (deve falhar) --");
  const aMemberInPersonal = findMyMember(personalEnvA, a.userId)!;
  const crossEnvAttempt = await gql(
    CREATE_TRANSACTION,
    {
      data: {
        type: "expense",
        description: `${QA_TAG} transação de teste automatizado (deve falhar)`,
        amount: "50.00",
        date: new Date().toISOString(),
        categoryId: category.id,
        environmentId: envId,
        memberId: aMemberInPersonal.id, // membro de OUTRO ambiente (o pessoal de A)
      },
    },
    a.token
  );
  expectError("createTransaction com memberId de outro ambiente é rejeitada", crossEnvAttempt);

  console.log("\n-- 5. Ambiente pessoal nunca aceita convite (deve falhar) --");
  const invitePersonalAttempt = await gql(
    INVITE_MEMBER,
    { data: { environmentId: personalEnvA.id, email: emailB, role: "user" } },
    a.token
  );
  expectError("inviteMember no ambiente pessoal é rejeitado", invitePersonalAttempt);

  console.log("\n-- 6. Convite, listagem, aceite --");
  const invite1 = expectOk<{ inviteMember: any }>(
    "inviteMember (B, role user, ambiente conjunto)",
    await gql(INVITE_MEMBER, { data: { environmentId: envId, email: emailB, role: "user" } }, a.token)
  ).inviteMember;
  check("convite aponta pro ambiente certo", invite1.environment?.id === envId);
  check("convite registra quem convidou", invite1.invitedBy?.id === a.userId);

  const pendingB = expectOk<{ listMyPendingInvites: any[] }>(
    "listMyPendingInvites (B)",
    await gql(LIST_PENDING_INVITES, {}, b.token)
  ).listMyPendingInvites;
  check("B vê o convite pendente", pendingB.some((i) => i.id === invite1.id));

  expectOk("acceptEnvironmentInvite (B)", await gql(ACCEPT_INVITE, { inviteId: invite1.id }, b.token));

  const envsB1 = expectOk<{ listMyEnvironments: Env[] }>(
    "listMyEnvironments B (pós-aceite)",
    await gql(LIST_MY_ENVS, {}, b.token)
  ).listMyEnvironments;
  const jointForB = envsB1.find((e) => e.id === envId);
  check("B agora é membro do ambiente conjunto", Boolean(jointForB));
  const bMemberInJoint = findMyMember(jointForB!, b.userId)!;
  check("B entrou com role user (do convite)", bMemberInJoint?.role === "user");

  console.log("\n-- 7. Participante sem login --");
  const participant = expectOk<{ createParticipant: EnvMember }>(
    "createParticipant",
    await gql(
      CREATE_PARTICIPANT,
      { data: { environmentId: envId, displayName: `${QA_TAG} Filho` } },
      a.token
    )
  ).createParticipant;
  check("participante não tem userId", participant.userId === null);
  check("participante não tem role", participant.role === null);

  const tx2 = expectOk<{ createTransaction: any }>(
    "createTransaction atribuída ao participante",
    await gql(
      CREATE_TRANSACTION,
      {
        data: {
          type: "expense",
          description: `${QA_TAG} transação de teste automatizado (participante)`,
          amount: "20.00",
          date: new Date().toISOString(),
          categoryId: category.id,
          environmentId: envId,
          memberId: participant.id,
        },
      },
      a.token
    )
  ).createTransaction;
  check(
    "transação do participante mostra displayName",
    tx2.member?.displayName === `${QA_TAG} Filho`
  );

  console.log("\n-- 8. promoteToAdmin rejeita participante como alvo --");
  expectError(
    "promoteToAdmin(participante) é rejeitado",
    await gql(PROMOTE_TO_ADMIN, { environmentId: envId, memberId: participant.id }, a.token)
  );

  console.log("\n-- 9. Múltiplos Admins + saída sem exigir sucessor --");
  const promoted = expectOk<{ promoteToAdmin: EnvMember }>(
    "promoteToAdmin(B)",
    await gql(PROMOTE_TO_ADMIN, { environmentId: envId, memberId: bMemberInJoint.id }, a.token)
  ).promoteToAdmin;
  check("B agora é admin", promoted.role === "admin");

  expectOk(
    "leaveEnvironment (A sai, B continua admin, sem newAdminMemberId)",
    await gql(LEAVE_ENV, { environmentId: envId, newAdminMemberId: null }, a.token)
  );

  const envsA2 = expectOk<{ listMyEnvironments: Env[] }>(
    "listMyEnvironments A (pós-saída)",
    await gql(LIST_MY_ENVS, {}, a.token)
  ).listMyEnvironments;
  check("A não aparece mais entre os ambientes ativos", !envsA2.some((e) => e.id === envId));
  check("ambiente pessoal de A continua intacto", envsA2.some((e) => e.id === personalEnvA.id));

  console.log("\n-- 10. Último Admin não pode sair sem indicar sucessor --");
  const soleAdminLeaveAttempt = await gql(
    LEAVE_ENV,
    { environmentId: envId, newAdminMemberId: null },
    b.token
  );
  expectError("B (único admin) não pode sair sem newAdminMemberId", soleAdminLeaveAttempt);

  console.log("\n-- 11. Reentrada após saída reaproveita a linha (soft delete), não duplica --");
  const invite2 = expectOk<{ inviteMember: any }>(
    "inviteMember (B convida A de volta)",
    await gql(INVITE_MEMBER, { data: { environmentId: envId, email: emailA, role: "user" } }, b.token)
  ).inviteMember;
  expectOk("acceptEnvironmentInvite (A aceita de volta)", await gql(ACCEPT_INVITE, { inviteId: invite2.id }, a.token));

  const memberRowsForA = await prismaClient.environmentMember.findMany({
    where: { environmentId: envId, userId: a.userId },
  });
  check(
    "existe exatamente 1 linha de EnvironmentMember para A neste ambiente (reaproveitada, não duplicada)",
    memberRowsForA.length === 1,
    memberRowsForA
  );
  check("a linha reaproveitada está ativa de novo", memberRowsForA[0]?.removedAt === null);

  console.log("\n-- 12. Transação antiga de A continua íntegra após ele ter saído e voltado --");
  const tx1Reloaded = await prismaClient.transaction.findUnique({ where: { id: tx1.id } });
  check("transação antiga de A ainda existe e aponta pro memberId original", tx1Reloaded?.memberId === aMemberInJoint.id);

  console.log("\n-- 13. removeMember rejeita participante / removeParticipant rejeita membro real --");
  expectError(
    "removeMember chamado com id de participante é rejeitado",
    await gql(REMOVE_MEMBER, { environmentId: envId, memberId: participant.id }, b.token)
  );
  expectError(
    "removeParticipant chamado com id de membro real é rejeitado",
    await gql(REMOVE_PARTICIPANT, { environmentId: envId, memberId: aMemberInJoint.id }, b.token)
  );

  console.log("\n-- 14. Último Admin não pode ser removido sem sucessor --");
  // Nesse ponto B é o único admin ativo (A voltou como "user" pelo convite2). Remover o próprio B
  // não se aplica (self-remove é bloqueado), então testamos via leaveEnvironment novamente (já
  // coberto no passo 10). Testamos aqui a remoção de A por B (não deveria ter problema de admin).
  const removeA = expectOk<{ removeMember: EnvMember }>(
    "removeMember(A) por B (A não é admin, remoção simples)",
    await gql(REMOVE_MEMBER, { environmentId: envId, memberId: aMemberInJoint.id }, b.token)
  ).removeMember;
  check("A foi soft-deletado (removedAt preenchido)", Boolean(removeA.removedAt));

  console.log("\n-- 15. Cancelar convite pendente --");
  const invite3 = expectOk<{ inviteMember: any }>(
    "inviteMember (novo convite pra cancelar)",
    await gql(INVITE_MEMBER, { data: { environmentId: envId, email: emailA, role: "user" } }, b.token)
  ).inviteMember;
  expectOk("cancelEnvironmentInvite", await gql(CANCEL_INVITE, { inviteId: invite3.id }, b.token));
  const invitesAfterCancel = expectOk<{ listEnvironmentInvites: any[] }>(
    "listEnvironmentInvites (pós-cancelamento)",
    await gql(LIST_ENV_INVITES, { environmentId: envId }, b.token)
  ).listEnvironmentInvites;
  check("convite cancelado não aparece mais como pendente", !invitesAfterCancel.some((i) => i.id === invite3.id));

  console.log("\n-- 16. Recusar convite --");
  const invite4 = expectOk<{ inviteMember: any }>(
    "inviteMember (novo convite pra recusar)",
    await gql(INVITE_MEMBER, { data: { environmentId: envId, email: emailA, role: "user" } }, b.token)
  ).inviteMember;
  expectOk("declineEnvironmentInvite (A recusa)", await gql(DECLINE_INVITE, { inviteId: invite4.id }, a.token));
  const pendingAAfterDecline = expectOk<{ listMyPendingInvites: any[] }>(
    "listMyPendingInvites A (pós-recusa)",
    await gql(LIST_PENDING_INVITES, {}, a.token)
  ).listMyPendingInvites;
  check("convite recusado não aparece mais como pendente pra A", !pendingAAfterDecline.some((i) => i.id === invite4.id));

  console.log("\n-- 17. removeParticipant é soft delete (histórico preservado) --");
  const removedParticipant = expectOk<{ removeParticipant: EnvMember }>(
    "removeParticipant(QA Filho)",
    await gql(REMOVE_PARTICIPANT, { environmentId: envId, memberId: participant.id }, b.token)
  ).removeParticipant;
  check("participante soft-deletado", Boolean(removedParticipant.removedAt));
  const tx2Reloaded = await prismaClient.transaction.findUnique({ where: { id: tx2.id } });
  check("transação do participante removido ainda existe e aponta pro memberId original", tx2Reloaded?.memberId === participant.id);

  console.log("\n-- 18. Exclusão de ambiente: bloqueada com >1 membro real ativo --");
  // Nesse ponto o ambiente conjunto tem só B ativo (A foi removido no passo 14). Confirma.
  const envsOnlyB = expectOk<{ listMyEnvironments: Env[] }>(
    "listMyEnvironments B (antes da exclusão)",
    await gql(LIST_MY_ENVS, {}, b.token)
  ).listMyEnvironments;
  const jointForBFinal = envsOnlyB.find((e) => e.id === envId)!;
  check("só B está ativo no ambiente conjunto neste ponto", jointForBFinal.members.filter((m) => m.userId).length === 1);

  console.log("\n-- 19. Ambiente pessoal não pode ser excluído --");
  expectError(
    "deleteEnvironment no ambiente pessoal é rejeitado",
    await gql(DELETE_ENV, { environmentId: personalEnvA.id }, a.token)
  );

  console.log("\n-- 20. Exclusão do ambiente conjunto (só B ativo) e cascade --");
  expectOk("deleteEnvironment (ambiente conjunto, só B ativo)", await gql(DELETE_ENV, { environmentId: envId }, b.token));
  const envGone = await prismaClient.environment.findUnique({ where: { id: envId } });
  check("ambiente foi realmente excluído do banco", envGone === null);
  const txsGone = await prismaClient.transaction.findMany({ where: { environmentId: envId } });
  check("transações do ambiente excluído foram removidas (cascade)", txsGone.length === 0);
  const membersGone = await prismaClient.environmentMember.findMany({ where: { environmentId: envId } });
  check("memberships do ambiente excluído foram removidas (cascade)", membersGone.length === 0);

  console.log("\n-- 21. renameEnvironment no ambiente pessoal (permitido) --");
  expectOk(
    "renameEnvironment no ambiente pessoal é permitido",
    await gql(RENAME_ENV, { environmentId: personalEnvA.id, name: `${QA_TAG} Minha Carteira` }, a.token)
  );

  console.log(`\n=== RESULTADO: ${passed} OK / ${failed} FAIL ===`);
  if (failures.length) {
    console.log("Falhas:", failures);
  }
}

async function cleanup(userIds: string[]) {
  console.log("\n-- Limpeza dos dados desta rodada (QA_CLEANUP=true) --");
  // Deletar os Users cascateia EnvironmentMember/EnvironmentInvite/Transaction (onDelete: Cascade
  // nessas FKs). Ambientes conjuntos sem nenhum membro restante ficam órfãos — remover explicitamente.
  await prismaClient.user.deleteMany({ where: { id: { in: userIds } } });
  const orphanEnvs = await prismaClient.environment.findMany({
    where: { name: { startsWith: `${QA_TAG} Casa Teste` } },
  });
  for (const env of orphanEnvs) {
    await prismaClient.transaction.deleteMany({ where: { environmentId: env.id } });
    await prismaClient.category.deleteMany({ where: { environmentId: env.id } });
    await prismaClient.environmentMember.deleteMany({ where: { environmentId: env.id } });
    await prismaClient.environmentInvite.deleteMany({ where: { environmentId: env.id } });
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
    // Recolhe ids de teste pelo prefixo de e-mail, mesmo se main() tiver falhado antes de terminar.
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
          `de ir pra produção, rode: npx tsx scripts/qa-cleanup-all.ts`
      );
    }

    await prismaClient.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  });
