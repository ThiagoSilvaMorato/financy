import { inject, singleton } from "tsyringe";
import { prismaClient } from "../../prisma/prisma";
import {
  CreateEnvironmentInput,
  CreateParticipantInput,
  InviteMemberInput,
} from "../dto/input/environment.input";
import { assertEnvironmentAccess, assertEnvironmentAdmin } from "../utils/environment-access";
import { EmailService } from "./email.service";

const INVITE_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

function assertValidRole(role: string): asserts role is "admin" | "user" {
  if (role !== "admin" && role !== "user") throw new Error("Papel inválido.");
}

@singleton()
export class EnvironmentService {
  constructor(@inject(EmailService) private emailService: EmailService) {}

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
    return prismaClient.environmentMember.findMany({
      where: { environmentId, removedAt: null },
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

  async inviteMember(data: InviteMemberInput, userId: string) {
    assertValidRole(data.role);
    await assertEnvironmentAdmin(data.environmentId, userId);

    const environment = await prismaClient.environment.findUnique({
      where: { id: data.environmentId },
    });
    if (!environment) throw new Error("Ambiente não encontrado.");
    if (environment.isPersonal) {
      throw new Error("Não é possível convidar alguém para o ambiente pessoal.");
    }

    const invitedUser = await prismaClient.user.findUnique({
      where: { email: data.email },
    });
    if (!invitedUser) throw new Error("Não existe usuário cadastrado com este e-mail.");

    if (invitedUser.id === userId) throw new Error("Você não pode convidar a si mesmo.");

    const existingMember = await prismaClient.environmentMember.findFirst({
      where: { environmentId: data.environmentId, userId: invitedUser.id, removedAt: null },
    });
    if (existingMember) throw new Error("Este usuário já é membro deste ambiente.");

    const existingInvite = await prismaClient.environmentInvite.findFirst({
      where: {
        environmentId: data.environmentId,
        invitedUserId: invitedUser.id,
        status: "pending",
      },
    });
    if (existingInvite) throw new Error("Já existe um convite pendente para este usuário.");

    const inviter = await prismaClient.user.findUnique({ where: { id: userId } });

    const invite = await prismaClient.environmentInvite.create({
      data: {
        environmentId: data.environmentId,
        invitedUserId: invitedUser.id,
        invitedByUserId: userId,
        role: data.role,
        expiresAt: new Date(Date.now() + INVITE_EXPIRY_MS),
      },
    });

    await this.emailService.sendEnvironmentInviteEmail(
      invitedUser.email,
      environment.name,
      inviter?.name ?? "Alguém"
    );

    return invite;
  }

  async cancelEnvironmentInvite(inviteId: string, userId: string) {
    const invite = await prismaClient.environmentInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite) throw new Error("Convite não encontrado.");

    // environmentId vem do convite buscado no banco, nunca de um argumento separado do client.
    await assertEnvironmentAdmin(invite.environmentId, userId);

    if (invite.status !== "pending") throw new Error("Este convite não está mais pendente.");

    await prismaClient.environmentInvite.delete({ where: { id: inviteId } });

    return true;
  }

  async listMyPendingInvites(userId: string) {
    return prismaClient.environmentInvite.findMany({
      where: { invitedUserId: userId, status: "pending" },
      orderBy: { createdAt: "desc" },
    });
  }

  async listEnvironmentInvites(environmentId: string, userId: string) {
    await assertEnvironmentAdmin(environmentId, userId);

    return prismaClient.environmentInvite.findMany({
      where: { environmentId, status: "pending" },
      orderBy: { createdAt: "desc" },
    });
  }

  async acceptEnvironmentInvite(inviteId: string, userId: string) {
    const invite = await this.findInviteForActingUser(inviteId, userId);

    if (invite.status !== "pending") throw new Error("Este convite não está mais pendente.");

    if (invite.expiresAt < new Date()) {
      await prismaClient.environmentInvite.update({
        where: { id: inviteId },
        data: { status: "expired" },
      });
      throw new Error("Este convite expirou.");
    }

    const existingMembership = await prismaClient.environmentMember.findFirst({
      where: { environmentId: invite.environmentId, userId },
    });

    if (existingMembership) {
      // Reativa a linha antiga em vez de criar uma nova — @@unique([environmentId, userId]) vale
      // sobre a tabela inteira (ativos e soft-deletados), um create incondicional falharia aqui.
      await prismaClient.environmentMember.update({
        where: { id: existingMembership.id },
        data: { role: invite.role, removedAt: null, joinedAt: new Date() },
      });
    } else {
      await prismaClient.environmentMember.create({
        data: {
          environmentId: invite.environmentId,
          userId,
          role: invite.role,
        },
      });
    }

    await prismaClient.environmentInvite.update({
      where: { id: inviteId },
      data: { status: "accepted" },
    });

    return true;
  }

  async declineEnvironmentInvite(inviteId: string, userId: string) {
    const invite = await this.findInviteForActingUser(inviteId, userId);

    if (invite.status !== "pending") throw new Error("Este convite não está mais pendente.");

    if (invite.expiresAt < new Date()) {
      await prismaClient.environmentInvite.update({
        where: { id: inviteId },
        data: { status: "expired" },
      });
      throw new Error("Este convite expirou.");
    }

    await prismaClient.environmentInvite.update({
      where: { id: inviteId },
      data: { status: "declined" },
    });

    return true;
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
    const member = await assertEnvironmentAccess(environmentId, userId);

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

  private async findInviteForActingUser(inviteId: string, userId: string) {
    const invite = await prismaClient.environmentInvite.findUnique({
      where: { id: inviteId },
    });
    if (!invite || invite.invitedUserId !== userId) throw new Error("Convite não encontrado.");

    return invite;
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
