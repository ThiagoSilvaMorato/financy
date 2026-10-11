import { Arg, FieldResolver, Mutation, Query, Resolver, Root, UseMiddleware } from "type-graphql";
import { IsAuth } from "../middleware/auth.middleware";
import { GqlUser } from "../graphql/decorators/user.decorator";
import { UserModel } from "../models/user.model";
import { EnvironmentModel } from "../models/environment.model";
import { EnvironmentMemberModel } from "../models/environment-member.model";
import { EnvironmentInviteModel } from "../models/environment-invite.model";
import { EnvironmentService } from "../services/environment.service";
import { EmailService } from "../services/email.service";
import {
  CreateEnvironmentInput,
  CreateParticipantInput,
  InviteMemberInput,
} from "../dto/input/environment.input";
import { prismaClient } from "../../prisma/prisma";

@Resolver(() => EnvironmentModel)
@UseMiddleware(IsAuth)
export class EnvironmentResolver {
  private emailService = new EmailService();
  private environmentService = new EnvironmentService(this.emailService);

  @Mutation(() => EnvironmentModel)
  async createEnvironment(
    @Arg("data", () => CreateEnvironmentInput) data: CreateEnvironmentInput,
    @GqlUser() user: UserModel
  ): Promise<EnvironmentModel> {
    return this.environmentService.createEnvironment(data, user.id);
  }

  @Mutation(() => EnvironmentModel)
  async renameEnvironment(
    @Arg("environmentId", () => String) environmentId: string,
    @Arg("name", () => String) name: string,
    @GqlUser() user: UserModel
  ): Promise<EnvironmentModel> {
    return this.environmentService.renameEnvironment(environmentId, name, user.id);
  }

  @Mutation(() => Boolean)
  async deleteEnvironment(
    @Arg("environmentId", () => String) environmentId: string,
    @GqlUser() user: UserModel
  ): Promise<boolean> {
    return this.environmentService.deleteEnvironment(environmentId, user.id);
  }

  @Mutation(() => Boolean)
  async setDefaultEnvironment(
    @Arg("environmentId", () => String) environmentId: string,
    @GqlUser() user: UserModel
  ): Promise<boolean> {
    return this.environmentService.setDefaultEnvironment(environmentId, user.id);
  }

  @Mutation(() => EnvironmentMemberModel)
  async createParticipant(
    @Arg("data", () => CreateParticipantInput) data: CreateParticipantInput,
    @GqlUser() user: UserModel
  ): Promise<EnvironmentMemberModel> {
    return this.environmentService.createParticipant(data, user.id);
  }

  @Mutation(() => EnvironmentMemberModel)
  async removeParticipant(
    @Arg("environmentId", () => String) environmentId: string,
    @Arg("memberId", () => String) memberId: string,
    @GqlUser() user: UserModel
  ): Promise<EnvironmentMemberModel> {
    return this.environmentService.removeParticipant(environmentId, memberId, user.id);
  }

  @Mutation(() => EnvironmentMemberModel)
  async promoteToAdmin(
    @Arg("environmentId", () => String) environmentId: string,
    @Arg("memberId", () => String) memberId: string,
    @GqlUser() user: UserModel
  ): Promise<EnvironmentMemberModel> {
    return this.environmentService.promoteToAdmin(environmentId, memberId, user.id);
  }

  @Mutation(() => EnvironmentMemberModel)
  async removeMember(
    @Arg("environmentId", () => String) environmentId: string,
    @Arg("memberId", () => String) memberId: string,
    @GqlUser() user: UserModel
  ): Promise<EnvironmentMemberModel> {
    return this.environmentService.removeMember(environmentId, memberId, user.id);
  }

  @Mutation(() => Boolean)
  async leaveEnvironment(
    @Arg("environmentId", () => String) environmentId: string,
    @Arg("newAdminMemberId", () => String, { nullable: true }) newAdminMemberId: string | null,
    @GqlUser() user: UserModel
  ): Promise<boolean> {
    return this.environmentService.leaveEnvironment(environmentId, user.id, newAdminMemberId);
  }

  @Mutation(() => EnvironmentInviteModel)
  async inviteMember(
    @Arg("data", () => InviteMemberInput) data: InviteMemberInput,
    @GqlUser() user: UserModel
  ): Promise<EnvironmentInviteModel> {
    return this.environmentService.inviteMember(data, user.id);
  }

  @Mutation(() => Boolean)
  async cancelEnvironmentInvite(
    @Arg("inviteId", () => String) inviteId: string,
    @GqlUser() user: UserModel
  ): Promise<boolean> {
    return this.environmentService.cancelEnvironmentInvite(inviteId, user.id);
  }

  @Mutation(() => Boolean)
  async acceptEnvironmentInvite(
    @Arg("inviteId", () => String) inviteId: string,
    @GqlUser() user: UserModel
  ): Promise<boolean> {
    return this.environmentService.acceptEnvironmentInvite(inviteId, user.id);
  }

  @Mutation(() => Boolean)
  async declineEnvironmentInvite(
    @Arg("inviteId", () => String) inviteId: string,
    @GqlUser() user: UserModel
  ): Promise<boolean> {
    return this.environmentService.declineEnvironmentInvite(inviteId, user.id);
  }

  @Query(() => [EnvironmentModel])
  async listMyEnvironments(@GqlUser() user: UserModel): Promise<EnvironmentModel[]> {
    return this.environmentService.listMyEnvironments(user.id);
  }

  @Query(() => [EnvironmentInviteModel])
  async listMyPendingInvites(@GqlUser() user: UserModel): Promise<EnvironmentInviteModel[]> {
    return this.environmentService.listMyPendingInvites(user.id);
  }

  @Query(() => [EnvironmentInviteModel])
  async listEnvironmentInvites(
    @Arg("environmentId", () => String) environmentId: string,
    @GqlUser() user: UserModel
  ): Promise<EnvironmentInviteModel[]> {
    return this.environmentService.listEnvironmentInvites(environmentId, user.id);
  }

  @FieldResolver(() => [EnvironmentMemberModel])
  async members(@Root() environment: EnvironmentModel): Promise<EnvironmentMemberModel[]> {
    return this.environmentService.listActiveMembers(environment.id);
  }
}

@Resolver(() => EnvironmentMemberModel)
@UseMiddleware(IsAuth)
export class EnvironmentMemberResolver {
  @FieldResolver(() => UserModel, { nullable: true })
  async user(@Root() member: EnvironmentMemberModel): Promise<UserModel | null> {
    if (!member.userId) return null;

    return prismaClient.user.findUnique({ where: { id: member.userId } });
  }
}

@Resolver(() => EnvironmentInviteModel)
@UseMiddleware(IsAuth)
export class EnvironmentInviteResolver {
  @FieldResolver(() => EnvironmentModel)
  async environment(@Root() invite: EnvironmentInviteModel): Promise<EnvironmentModel> {
    const environment = await prismaClient.environment.findUnique({
      where: { id: invite.environmentId },
    });
    if (!environment) throw new Error("Ambiente não encontrado.");

    return environment;
  }

  @FieldResolver(() => UserModel)
  async invitedBy(@Root() invite: EnvironmentInviteModel): Promise<UserModel> {
    const user = await prismaClient.user.findUnique({
      where: { id: invite.invitedByUserId },
    });
    if (!user) throw new Error("Usuário não encontrado.");

    return user;
  }
}
