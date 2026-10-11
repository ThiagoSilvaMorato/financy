/**
 * Limpeza em massa de TODO dado gerado por QA, de qualquer rodada, em qualquer script.
 * Rode isso uma vez antes de ir pra produção (ou sempre que quiser o banco de dev limpo).
 *
 * Critérios de identificação (cobre a convenção atual "[QA]" e a antiga "QA " sem colchetes):
 *   - User: e-mail começando com "qa-" no domínio reservado "@test.local".
 *   - Environment: nome começando com "[QA]" ou "QA ", OU ambiente pessoal (isPersonal: true)
 *     sem nenhum membro — isso nunca deveria acontecer num ambiente pessoal de verdade (todo
 *     usuário real sempre tem exatamente 1 membro no próprio ambiente pessoal), então zero
 *     membros ali é por definição lixo de uma rodada de QA anterior que apagou o User sem apagar
 *     o Environment junto.
 *
 * Uso:
 *   npx tsx scripts/qa-cleanup-all.ts            (mostra o que seria apagado, sem apagar)
 *   npx tsx scripts/qa-cleanup-all.ts --apply     (apaga de verdade)
 */
import { prismaClient } from "../prisma/prisma";

const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(`\n=== Limpeza de dados de QA (${APPLY ? "APLICANDO" : "dry-run, nada será apagado"}) ===\n`);

  const qaUsers = await prismaClient.user.findMany({
    where: { email: { startsWith: "qa-" }, AND: { email: { endsWith: "@test.local" } } },
    select: { id: true, name: true, email: true },
  });

  const taggedEnvs = await prismaClient.environment.findMany({
    where: {
      OR: [
        { name: { startsWith: "[QA]" } },
        { name: { startsWith: "QA " } },
        { isPersonal: true, members: { none: {} } },
      ],
    },
    select: { id: true, name: true, isPersonal: true },
  });

  console.log(`Usuários de QA encontrados: ${qaUsers.length}`);
  for (const u of qaUsers) console.log(`  - ${u.email} (${u.name})`);

  console.log(`\nAmbientes de QA / órfãos encontrados: ${taggedEnvs.length}`);
  for (const e of taggedEnvs) console.log(`  - ${e.name} (isPersonal: ${e.isPersonal}) [${e.id}]`);

  if (!APPLY) {
    console.log(
      "\nNada foi apagado (dry-run). Rode de novo com --apply para executar a limpeza de verdade."
    );
    return;
  }

  // Apaga os ambientes primeiro (Transaction.memberId é onDelete: Restrict, então Transaction
  // precisa ser removida antes de EnvironmentMember — mesma ordem usada em
  // EnvironmentService.deleteEnvironment).
  for (const env of taggedEnvs) {
    await prismaClient.transaction.deleteMany({ where: { environmentId: env.id } });
    await prismaClient.category.deleteMany({ where: { environmentId: env.id } });
    await prismaClient.environmentMember.deleteMany({ where: { environmentId: env.id } });
    await prismaClient.environmentInvite.deleteMany({ where: { environmentId: env.id } });
    await prismaClient.environment.delete({ where: { id: env.id } });
  }

  // Deletar os Users cascateia qualquer EnvironmentMember/EnvironmentInvite/Transaction que
  // ainda reste (ex.: ambiente pessoal de um usuário de QA que não batia em nenhum critério acima
  // por algum motivo).
  await prismaClient.user.deleteMany({ where: { id: { in: qaUsers.map((u) => u.id) } } });

  console.log(
    `\nRemovidos: ${qaUsers.length} usuário(s) de QA, ${taggedEnvs.length} ambiente(s) de QA/órfão(s).`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prismaClient.$disconnect());
