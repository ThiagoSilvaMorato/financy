import { Arg, FieldResolver, Mutation, Query, Resolver, Root, UseMiddleware } from "type-graphql";
import { IsAuth } from "../middleware/auth.middleware";
import { GqlUser } from "../graphql/decorators/user.decorator";
import { UserModel } from "../models/user.model";
import { EnvironmentModel } from "../models/environment.model";
import { EnvironmentMemberModel } from "../models/environment-member.model";
import { EnvironmentInviteCodeModel } from "../models/environment-invite-code.model";
import { EnvironmentService } from "../services/environment.service";
import { CreateEnvironmentInput, CreateParticipantInput } from "../dto/input/environment.input";
import { prismaClient } from "../../prisma/prisma";
import { hasEnvironmentAccess, isEnvironmentAdmin } from "../utils/environment-access";

@Resolver(() => EnvironmentModel)
@UseMiddleware(IsAuth)
export class EnvironmentResolver {
  private environmentService = new EnvironmentService();

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

  @Mutation(() => EnvironmentMemberModel)
  async approveMember(
    @Arg("environmentId", () => String) environmentId: string,
    @Arg("memberId", () => String) memberId: string,
    @GqlUser() user: UserModel
  ): Promise<EnvironmentMemberModel> {
    return this.environmentService.approveMember(environmentId, memberId, user.id);
  }

  @Mutation(() => Boolean)
  async leaveEnvironment(
    @Arg("environmentId", () => String) environmentId: string,
    @Arg("newAdminMemberId", () => String, { nullable: true }) newAdminMemberId: string | null,
    @GqlUser() user: UserModel
  ): Promise<boolean> {
    return this.environmentService.leaveEnvironment(environmentId, user.id, newAdminMemberId);
  }

  @Mutation(() => EnvironmentInviteCodeModel)
  async generateEnvironmentInviteCode(
    @Arg("environmentId", () => String) environmentId: string,
    @GqlUser() user: UserModel
  ): Promise<EnvironmentInviteCodeModel> {
    return this.environmentService.generateEnvironmentInviteCode(environmentId, user.id);
  }

  @Mutation(() => EnvironmentModel)
  async joinEnvironmentByCode(
    @Arg("code", () => String) code: string,
    @GqlUser() user: UserModel
  ): Promise<EnvironmentModel> {
    return this.environmentService.joinEnvironmentByCode(code, user.id);
  }

  @Query(() => [EnvironmentModel])
  async listMyEnvironments(@GqlUser() user: UserModel): Promise<EnvironmentModel[]> {
    return this.environmentService.listMyEnvironments(user.id);
  }

  @Query(() => EnvironmentInviteCodeModel, { nullable: true })
  async getCurrentInviteCode(
    @Arg("environmentId", () => String) environmentId: string,
    @GqlUser() user: UserModel
  ): Promise<EnvironmentInviteCodeModel | null> {
    return this.environmentService.getCurrentInviteCode(environmentId, user.id);
  }

  // Preview sem efeito colateral de quem ainda NÃO é membro — exige usuário autenticado (IsAuth
  // no resolver inteiro), não exige ser membro. Por isso os field resolvers `members`/
  // `pendingMembers` abaixo checam acesso por conta própria: EnvironmentModel aqui pode ser
  // devolvido para quem ainda não entrou no ambiente.
  @Query(() => EnvironmentModel)
  async getEnvironmentByInviteCode(
    @Arg("code", () => String) code: string
  ): Promise<EnvironmentModel> {
    return this.environmentService.getEnvironmentByInviteCode(code);
  }

  @FieldResolver(() => [EnvironmentMemberModel], { nullable: true })
  async members(
    @Root() environment: EnvironmentModel,
    @GqlUser() user: UserModel
  ): Promise<EnvironmentMemberModel[] | null> {
    // Checagem própria, não só confiar em quem chamou antes: EnvironmentModel também é devolvido
    // por getEnvironmentByInviteCode para quem ainda não é membro — sem isso, qualquer pessoa com
    // um código válido (ou adivinhado) veria PII (nome/e-mail) de todo mundo do ambiente.
    //
    // null (sem acesso) em vez de lançar erro: listMyEnvironments também devolve o ambiente onde o
    // próprio usuário está "pending" (precisa aparecer na lista), e um erro aqui anularia a lista
    // inteira (members é um campo não-nulo dentro de uma lista não-nula).
    if (!(await hasEnvironmentAccess(environment.id, user.id))) return null;

    return this.environmentService.listActiveMembers(environment.id);
  }

  // Admin only — diferente de `members`, que qualquer membro ativo pode ver. Só um Admin deveria
  // saber quem está tentando entrar. Mesma razão de devolver null em vez de lançar erro.
  @FieldResolver(() => [EnvironmentMemberModel], { nullable: true })
  async pendingMembers(
    @Root() environment: EnvironmentModel,
    @GqlUser() user: UserModel
  ): Promise<EnvironmentMemberModel[] | null> {
    if (!(await isEnvironmentAdmin(environment.id, user.id))) return null;

    return this.environmentService.listPendingMembers(environment.id, user.id);
  }

  // Sem checagem de acesso: é a própria linha de quem perguntou, nunca a de outra pessoa — ao
  // contrário de `members`/`pendingMembers`, não existe vazamento de PII possível aqui. Precisa
  // existir porque é o único jeito de alguém "pending" descobrir que está pending (members, onde o
  // role apareceria, é null pra essa pessoa de propósito).
  @FieldResolver(() => EnvironmentMemberModel, { nullable: true })
  async myMembership(
    @Root() environment: EnvironmentModel,
    @GqlUser() user: UserModel
  ): Promise<EnvironmentMemberModel | null> {
    return prismaClient.environmentMember.findFirst({
      where: { environmentId: environment.id, userId: user.id, removedAt: null },
    });
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
