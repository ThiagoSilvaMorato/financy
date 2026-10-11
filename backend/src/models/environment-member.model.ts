import { Field, GraphQLISODateTime, ID, ObjectType } from "type-graphql";
import { UserModel } from "./user.model";

@ObjectType()
export class EnvironmentMemberModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  environmentId!: string;

  @Field(() => String, { nullable: true })
  userId?: string | null;

  @Field(() => String, { nullable: true })
  role?: string | null;

  @Field(() => String, { nullable: true })
  displayName?: string | null;

  @Field(() => UserModel, { nullable: true })
  user?: UserModel | null;

  @Field(() => GraphQLISODateTime)
  joinedAt!: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  removedAt?: Date | null;
}
