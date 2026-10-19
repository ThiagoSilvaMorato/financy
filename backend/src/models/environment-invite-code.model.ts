import { Field, GraphQLISODateTime, ObjectType } from "type-graphql";

@ObjectType()
export class EnvironmentInviteCodeModel {
  @Field(() => String)
  environmentId!: string;

  @Field(() => String)
  code!: string;

  @Field(() => GraphQLISODateTime)
  expiresAt!: Date;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;
}
