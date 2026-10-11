import { Field, GraphQLISODateTime, ID, ObjectType } from "type-graphql";
import { EnvironmentModel } from "./environment.model";
import { UserModel } from "./user.model";

@ObjectType()
export class EnvironmentInviteModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  environmentId!: string;

  @Field(() => EnvironmentModel)
  environment?: EnvironmentModel;

  // Id bruto de quem convidou. Não decorado — resolvido como UserModel pelo FieldResolver
  // `invitedBy` em EnvironmentInviteResolver.
  invitedByUserId!: string;

  @Field(() => UserModel)
  invitedBy?: UserModel;

  @Field(() => String)
  role!: string;

  @Field(() => String)
  status!: string;

  @Field(() => GraphQLISODateTime)
  expiresAt!: Date;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}
