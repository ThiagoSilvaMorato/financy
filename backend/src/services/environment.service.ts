import { Prisma } from "@prisma/client";
import { singleton } from "tsyringe";
import { prismaClient } from "../../prisma/prisma";
import { CreateEnvironmentInput, CreateParticipantInput } from "../dto/input/environment.input";
import {
  assertEnvironmentAccess,
  assertEnvironmentAdmin,
  assertEnvironmentMember,
} from "../utils/environment-access";
import { generateInviteCode, normalizeInviteCode } from "../utils/invite-code";

const INVITE_CODE_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias
const INVITE_CODE_GENERATION_ATTEMPTS = 5;

function isUniqueCodeCollision(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    (error.meta?.target as string[] | undefined)?.includes("code") === true
  );
}

@singleton()
export class EnvironmentService {
  async createEnvironment(data: CreateEnvironmentInput, userId: string) {
    const environment = await prismaClient.environment.create({
      data: {
        name: data.name,
        isPersonal: false,
        members: {
          create: { userId, role: "admin" },
        },
      },
    });

    return environment;
  }

  async renameEnvironment(environmentId: string, name: string, userId: string) {
    await assertEnvironmentAdmin(environmentId, userId);

    return prismaClient.environment.update({
      where: { id: environmentId },
      data: { name },
    });
  }

  async listMyEnvironments(userId: string) {
    return prismaClient.environment.findMany({
      where: { members: { some: { userId, removedAt: null } } },
      orderBy: { createdAt: "asc" },
    });
  }

  async listActiveMembers(environmentId: string) {
    // "pending" nunca aparece na lista geral de membros — fecha por construção a classe de bug
    // "esqueci de filtrar pending em algum lugar que lista membros" (ex.: select de atribuição de
    // transação no frontend). Quem precisa ver quem está pendente usa listPendingMembers (Admin only).
    return prismaClient.environmentMember.findMany({
      where: { environmentId, removedAt: null, role: { not: "pending" } },
      orderBy: { joinedAt: "asc" },
    });
  }

  async listPendingMembers(environmentId: string, userId: string) {
    await assertEnvironmentAdmin(environmentId, userId);

    return prismaClient.environmentMember.findMany({
      where: { environmentId, removedAt: null, role: "pending" },
      orderBy: { joinedAt: "asc" },
    });
  }

  async setDefaultEnvironment(environmentId: string, userId: string) {
    await assertEnvironmentAccess(environmentId, userId);

    await prismaClient.user.update({
      where: { id: userId },
      data: { defaultEnvironmentId: environmentId },
    });

    return true;
  }

  async createParticipant(data: CreateParticipantInput, userId: string) {
    await assertEnvironmentAdmin(data.environmentId, userId);

    return prismaClient.environmentMember.create({
      data: {
        environmentId: data.environmentId,
        displayName: data.displayName,
        userId: null,
        role: null,
      },
    });
  }

  async removeParticipant(environmentId: string, memberId: string, userId: string) {
    await assertEnvironmentAdmin(environmentId, userId);

    const participant = await prismaClient.environmentMember.findUnique({
      where: { id: memberId },
    });

    if (
      !participant ||
      participant.environmentId !== environmentId ||
      participant.userId !== null ||
      participant.removedAt !== null
    ) {
      throw new Error("Participante não encontrado.");
    }

    return prismaClient.environmentMember.update({
      where: { id: memberId },
      data: { removedAt: new Date() },
    });
  }

  async generateEnvironmentInviteCode(environmentId: string, userId: string) {
    await assertEnvironmentAdmin(environmentId, userId);

    const environment = await prismaClient.environment.findUnique({
      where: { id: environmentId },
    });
    if (!environment) throw new Error("Ambiente não encontrado.");
    if (environment.isPersonal) {
      throw new Error("Não é possível gerar código de convite para o ambiente pessoal.");
    }

    const expiresAt = new Date(Date.now() + INVITE_CODE_EXPIRY_MS);

    for (let attempt = 0; attempt < INVITE_CODE_GENERATION_ATTEMPTS; attempt++) {
      const code = generateInviteCode();

      try {
        // Chave primária environmentId garante no máximo 1 código ativo por ambiente — gerar um
        // novo substitui o anterior na mesma linha (nunca cria uma segunda).
        return await prismaClient.environmentInviteCode.upsert({
          where: { environmentId },
          create: { environmentId, code, createdByUserId: userId, expiresAt },
          update: { code, createdByUserId: userId, expiresAt },
        });
      } catch (error) {
        // Colisão de "code" (único globalmente) com o código de outro ambiente — extremamente
        // improvável, mas trivial de tratar: gerar outro código e tentar de novo.
        if (isUniqueCodeCollision(error)) continue;
        throw error;
      }
    }

    throw new Error("Não foi possível gerar um código de convite único. Tente novamente.");
  }

  async getCurrentInviteCode(environmentId: string, userId: string) {
    await assertEnvironmentAdmin(environmentId, userId);

    const inviteCode = await prismaClient.environmentInviteCode.findUnique({
      where: { environmentId },
    });

    // Expirado é tratado como "sem código ativo", igual a nunca ter gerado — a expiração é checada
    // de forma lazy, sem job/cron.
    if (!inviteCode || inviteCode.expiresAt < new Date()) return null;

    return inviteCode;
  }

  async getEnvironmentByInviteCode(code: string) {
    const inviteCode = await this.findValidInviteCode(code);

    const environment = await prismaClient.environment.findUnique({
      where: { id: inviteCode.environmentId },
    });
    if (!environment) throw new Error("Ambiente não encontrado.");

    return environment;
  }

  async joinEnvironmentByCode(code: string, userId: string) {
    const inviteCode = await this.findValidInviteCode(code);
    const environmentId = inviteCode.environmentId;

    const existingMembership = await prismaClient.environmentMember.findFirst({
      where: { environmentId, userId },
    });

    if (existingMembership && existingMembership.removedAt === null) {
      // Já é membro ativo (admin, user ou pending) — no-op idempotente. Sem esta checagem, reusar
      // o código rebaixaria quem já é user/admin aprovado para pending (auto-demoção destrutiva).
      return this.findEnvironmentOrThrow(environmentId);
    }

    if (existingMembership) {
      // Reativa a linha soft-deletada em vez de criar uma nova (@@unique([environmentId, userId])
      // vale sobre a tabela inteira). Reentrada por código sempre volta como "pending", mesmo que
      // o role anterior (antes de sair) fosse "user"/"admin" — postura de segurança consistente.
      await prismaClient.environmentMember.update({
        where: { id: existingMembership.id },
        data: { role: "pending", removedAt: null, joinedAt: new Date() },
      });
    } else {
      await prismaClient.environmentMember.create({
        data: { environmentId, userId, role: "pending" },
      });
    }

    return this.findEnvironmentOrThrow(environmentId);
  }

  async approveMember(environmentId: string, memberId: string, userId: string) {
    await assertEnvironmentAdmin(environmentId, userId);

    const target = await prismaClient.environmentMember.findUnique({
      where: { id: memberId },
    });

    if (
      !target ||
      target.environmentId !== environmentId ||
      target.removedAt !== null ||
      target.role !== "pending"
    ) {
      throw new Error("Membro não encontrado ou já aprovado.");
    }

    return prismaClient.environmentMember.update({
      where: { id: memberId },
      data: { role: "user" },
    });
  }

  async promoteToAdmin(environmentId: string, memberId: string, userId: string) {
    await assertEnvironmentAdmin(environmentId, userId);

    const target = await prismaClient.environmentMember.findUnique({
      where: { id: memberId },
    });

    if (
      !target ||
      target.environmentId !== environmentId ||
      target.removedAt !== null ||
      target.userId === null
    ) {
      throw new Error("Membro não encontrado.");
    }

    if (target.role !== "user") {
      throw new Error("Aprove este membro antes de promovê-lo a administrador.");
    }

    return prismaClient.environmentMember.update({
      where: { id: memberId },
      data: { role: "admin" },
    });
  }

  async removeMember(environmentId: string, memberId: string, userId: string) {
    const actingMember = await assertEnvironmentAdmin(environmentId, userId);

    const target = await prismaClient.environmentMember.findUnique({
      where: { id: memberId },
    });

    if (
      !target ||
      target.environmentId !== environmentId ||
      target.removedAt !== null ||
      target.userId === null
    ) {
      throw new Error("Membro não encontrado.");
    }

    if (target.id === actingMember.id) {
      throw new Error("Use a saída do ambiente (leaveEnvironment) para se remover.");
    }

    await this.guardLastAdmin(environmentId, target);

    return prismaClient.environmentMember.update({
      where: { id: memberId },
      data: { removedAt: new Date() },
    });
  }

  async leaveEnvironment(
    environmentId: string,
    userId: string,
    newAdminMemberId?: string | null
  ) {
    // Checagem ampla: quem está "pending" também pode sair livremente, sem razão de segurança
    // para impedir isso.
    const member = await assertEnvironmentMember(environmentId, userId);

    const totalActive = await prismaClient.environmentMember.count({
      where: { environmentId, removedAt: null },
    });
    if (totalActive === 1) {
      throw new Error(
        "Você é o único membro deste ambiente. Para saír, exclua o ambiente."
      );
    }

    if (member.role === "admin") {
      const otherAdmins = await prismaClient.environmentMember.count({
        where: { environmentId, removedAt: null, role: "admin", id: { not: member.id } },
      });

      if (otherAdmins === 0) {
        if (!newAdminMemberId) {
          throw new Error(
            "Você é o último administrador deste ambiente. Indique um novo administrador antes de saír."
          );
        }

        const successor = await prismaClient.environmentMember.findUnique({
          where: { id: newAdminMemberId },
        });

        if (
          !successor ||
          successor.environmentId !== environmentId ||
          successor.removedAt !== null ||
          successor.userId === null ||
          successor.id === member.id
        ) {
          throw new Error("Novo administrador inválido.");
        }

        // Mesma guarda de promoteToAdmin: "pending" precisa ser aprovado (role: "user") antes de
        // poder virar Admin. Sem isso, o último Admin ao sair poderia nomear alguém ainda não
        // aprovado como sucessor, dando acesso de Admin completo a quem nunca foi vetado.
        if (successor.role !== "user") {
          throw new Error("Aprove este membro antes de torná-lo administrador.");
        }

        await prismaClient.environmentMember.update({
          where: { id: successor.id },
          data: { role: "admin" },
        });
      }
    }

    await prismaClient.environmentMember.update({
      where: { id: member.id },
      data: { removedAt: new Date() },
    });

    return true;
  }

  async deleteEnvironment(environmentId: string, userId: string) {
    await assertEnvironmentAdmin(environmentId, userId);

    const environment = await prismaClient.environment.findUnique({
      where: { id: environmentId },
    });
    if (!environment) throw new Error("Ambiente não encontrado.");
    if (environment.isPersonal) throw new Error("O ambiente pessoal não pode ser excluído.");

    // Também conta quem está "pending" — é preciso aprovar ou remover antes de poder excluir.
    const activeRealMembers = await prismaClient.environmentMember.count({
      where: { environmentId, removedAt: null, userId: { not: null } },
    });
    if (activeRealMembers !== 1) {
      throw new Error(
        "Só é possível excluir o ambiente quando restar exatamente um membro real ativo."
      );
    }

    // Transaction precisa ser apagada antes de EnvironmentMember (Transaction.memberId é
    // onDelete: Restrict) — mesmo padrão de $transaction já usado em CategoryService.deleteCategory.
    await prismaClient.$transaction([
      prismaClient.transaction.deleteMany({ where: { environmentId } }),
      prismaClient.category.deleteMany({ where: { environmentId } }),
      prismaClient.environmentMember.deleteMany({ where: { environmentId } }),
      prismaClient.environment.delete({ where: { id: environmentId } }),
    ]);

    return true;
  }

  private async findValidInviteCode(code: string) {
    const normalizedCode = normalizeInviteCode(code);

    const inviteCode = await prismaClient.environmentInviteCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!inviteCode || inviteCode.expiresAt < new Date()) {
      throw new Error("Código de convite inválido ou expirado.");
    }

    return inviteCode;
  }

  private async findEnvironmentOrThrow(environmentId: string) {
    const environment = await prismaClient.environment.findUnique({
      where: { id: environmentId },
    });
    if (!environment) throw new Error("Ambiente não encontrado.");

    return environment;
  }

  private async guardLastAdmin(
    environmentId: string,
    target: { id: string; role: string | null }
  ) {
    if (target.role !== "admin") return;

    const otherAdmins = await prismaClient.environmentMember.count({
      where: { environmentId, removedAt: null, role: "admin", id: { not: target.id } },
    });

    if (otherAdmins === 0) {
      throw new Error(
        "Promova outro administrador antes de remover o último administrador do ambiente."
      );
    }
  }
}
