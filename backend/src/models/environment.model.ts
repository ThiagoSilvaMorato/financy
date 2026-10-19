import { Field, GraphQLISODateTime, ID, ObjectType } from "type-graphql";
import { EnvironmentMemberModel } from "./environment-member.model";

@ObjectType()
export class EnvironmentModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => Boolean)
  isPersonal!: boolean;

  // Nullable: o field resolver devolve null (em vez de lançar erro) quando quem pediu não tem
  // acesso aos dados deste ambiente especifico (ex.: está "pending", ou é preview via
  // getEnvironmentByInviteCode). Null nunca vaza PII — e, crucialmente, não propaga erro pro
  // restante da resposta: listMyEnvironments devolve [EnvironmentModel]! (lista não-nula), então
  // um erro ao resolver `members` de UM ambiente pending anularia a lista inteira do usuário.
  @Field(() => [EnvironmentMemberModel], { nullable: true })
  members?: EnvironmentMemberModel[] | null;

  // Admin only — ver field resolver em EnvironmentResolver. Mesma razão de ser nullable que `members`.
  @Field(() => [EnvironmentMemberModel], { nullable: true })
  pendingMembers?: EnvironmentMemberModel[] | null;

  // A própria membership de quem está pedindo (nunca a de outra pessoa) — por isso não precisa da
  // mesma checagem de acesso que `members`/`pendingMembers`: revelar o próprio role de alguém nunca
  // é vazamento de PII. Existe porque, sem isso, quem está "pending" não teria NENHUMA forma de
  // descobrir que está pending — `members` (onde o role apareceria) é exatamente o campo que fica
  // null pra essa pessoa. `null` aqui significa "não é membro nenhum deste ambiente" (ex.: preview
  // via getEnvironmentByInviteCode, antes de entrar).
  @Field(() => EnvironmentMemberModel, { nullable: true })
  myMembership?: EnvironmentMemberModel | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
