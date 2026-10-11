import { GraphQLError } from "graphql";
import { prismaClient } from "../../prisma/prisma";

/**
 * Confirma que existe um EnvironmentMember ativo (removedAt: null, userId preenchido) com esse
 * userId nesse ambiente. Substitui a checagem manual `registro.userId !== userId` antes repetida
 * em TransactionService/CategoryService.
 */
export async function assertEnvironmentAccess(environmentId: string, userId: string) {
  const member = await prismaClient.environmentMember.findFirst({
    where: { environmentId, userId, removedAt: null },
  });

  if (!member) {
    throw new GraphQLError("Você não tem acesso a este ambiente.", {
      extensions: { code: "FORBIDDEN" },
    });
  }

  return member;
}

/**
 * Mesma base de assertEnvironmentAccess, mas também exige role: admin no EnvironmentMember ativo.
 */
export async function assertEnvironmentAdmin(environmentId: string, userId: string) {
  const member = await assertEnvironmentAccess(environmentId, userId);

  if (member.role !== "admin") {
    throw new GraphQLError("Apenas administradores podem realizar esta ação.", {
      extensions: { code: "FORBIDDEN" },
    });
  }

  return member;
}
