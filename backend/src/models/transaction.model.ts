import { TransactionType } from "@prisma/client";
import { Field, GraphQLISODateTime, ID, ObjectType } from "type-graphql";
import { CategoryModel } from "./category.model";
import { UserModel } from "./user.model";
import { EnvironmentMemberModel } from "./environment-member.model";

@ObjectType()
export class TransactionModel {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  type!: TransactionType;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => GraphQLISODateTime)
  date!: Date;

  @Field(() => String)
  amount!: string;

  @Field(() => String)
  categoryId!: string;

  @Field(() => CategoryModel, { nullable: true })
  category?: CategoryModel;

  @Field(() => String)
  memberId!: string;

  @Field(() => EnvironmentMemberModel)
  member?: EnvironmentMemberModel;

  // Id bruto de quem lançou a transação (auditoria). Não decorado para não colidir com o campo
  // GraphQL `createdBy`, que expõe o UserModel resolvido (ver TransactionResolver.createdBy).
  createdBy!: string;

  @Field(() => UserModel, { name: "createdBy" })
  createdByUser?: UserModel;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
