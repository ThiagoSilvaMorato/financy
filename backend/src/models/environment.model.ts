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

  @Field(() => [EnvironmentMemberModel])
  members?: EnvironmentMemberModel[];

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
