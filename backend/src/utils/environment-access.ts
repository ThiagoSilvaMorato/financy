import { GraphQLError } from "graphql";
import { prismaClient } from "../../prisma/prisma";

/**
 * Confirma que existe um EnvironmentMember ativo (removedAt: null, userId preenchido) com esse
 * userId nesse ambiente, de qualquer role — incluindo "pending". Checagem ampla de identidade/
 * membership, não de acesso a dados: usada só por operações que não expõem Category/Transaction
 * do ambiente (hoje, leaveEnvironment).
 */
export async function assertEnvironmentMember(environmentId: string, userId: string) {
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
 * Confirma que existe um EnvironmentMember ativo com role "admin" ou "user" — exclui "pending" de
 * propósito. É a porta de acesso aos dados do ambiente (Category/Transaction, setDefaultEnvironment,
 * etc.). Substitui a checagem manual `registro.userId !== userId` antes repetida em
 * TransactionService/CategoryService.
 *
 * A mensagem de erro é diferenciada para quem está "pending" só por UX (a garantia de segurança é
 * o filtro de role em si, não o texto da mensagem) — o frontend trata "pending" de forma explícita
 * a partir de listMyEnvironments, não reagindo a este erro.
 */
export async function assertEnvironmentAccess(environmentId: string, userId: string) {
  const member = await prismaClient.environmentMember.findFirst({
    where: { environmentId, userId, removedAt: null },
  });

  if (!member || member.role === "pending") {
    const message = member
      ? "Seu acesso a este ambiente ainda não foi aprovado por um administrador."
      : "Você não tem acesso a este ambiente.";
    throw new GraphQLError(message, {
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

/**
 * Variantes booleanas (nunca lançam) de assertEnvironmentAccess/assertEnvironmentAdmin, para
 * field resolvers que precisam devolver null (em vez de propagar erro) quando quem pediu não tem
 * acesso — ex.: EnvironmentModel.members/pendingMembers, onde o Environment pode ter sido
 * devolvido por listMyEnvironments (o próprio ambiente está "pending" para esse usuário) ou por
 * getEnvironmentByInviteCode (preview de quem ainda nem é membro).
 */
export async function hasEnvironmentAccess(environmentId: string, userId: string): Promise<boolean> {
  try {
    await assertEnvironmentAccess(environmentId, userId);
    return true;
  } catch {
    return false;
  }
}

export async function isEnvironmentAdmin(environmentId: string, userId: string): Promise<boolean> {
  try {
    await assertEnvironmentAdmin(environmentId, userId);
    return true;
  } catch {
    return false;
  }
}
