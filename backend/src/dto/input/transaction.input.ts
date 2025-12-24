import { TransactionType } from "@prisma/client";
import { Field, GraphQLISODateTime, InputType } from "type-graphql";

@InputType()
export class CreateTransactionInput {
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
}
