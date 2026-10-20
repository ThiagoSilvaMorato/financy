import { TransactionType } from "@prisma/client";
import { Field, GraphQLISODateTime, InputType, Int } from "type-graphql";

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

  @Field(() => String)
  environmentId!: string;

  @Field(() => String)
  memberId!: string;
}

// installmentPurchaseId/installmentNumber não entram aqui de propósito — só createInstallmentPurchase
// grava esses campos (ver docs/plans/03-BACKEND-pagamento-credito.md).
@InputType()
export class CreateInstallmentPurchaseInput {
  @Field(() => String)
  description!: string;

  @Field(() => String)
  type!: TransactionType;

  // Valor total da compra OU valor de cada parcela, dependendo de amountIsTotal.
  @Field(() => String)
  amount!: string;

  @Field(() => Boolean)
  amountIsTotal!: boolean;

  @Field(() => Int)
  installmentsCount!: number;

  @Field(() => GraphQLISODateTime)
  startDate!: Date;

  @Field(() => String)
  categoryId!: string;

  @Field(() => String)
  environmentId!: string;

  @Field(() => String)
  memberId!: string;
}
