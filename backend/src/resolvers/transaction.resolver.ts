import { Arg, FieldResolver, Mutation, Query, Resolver, Root, UseMiddleware } from "type-graphql";
import { IsAuth } from "../middleware/auth.middleware";
import { CategoryService } from "../services/category.service";
import { CategoryModel } from "../models/category.model";
import { GqlUser } from "../graphql/decorators/user.decorator";
import { UserModel } from "../models/user.model";
import { TransactionModel } from "../models/transaction.model";
import { TransactionService } from "../services/transaction.service";
import { CreateInstallmentPurchaseInput, CreateTransactionInput } from "../dto/input/transaction.input";
import { EnvironmentMemberModel } from "../models/environment-member.model";
import { prismaClient } from "../../prisma/prisma";

@Resolver(() => TransactionModel)
@UseMiddleware(IsAuth)
export class TransactionResolver {
  private transactionService = new TransactionService();
  private categoryService = new CategoryService();

  @Mutation(() => TransactionModel)
  async createTransaction(
    @Arg("data", () => CreateTransactionInput) data: CreateTransactionInput,
    @GqlUser() user: UserModel
  ): Promise<TransactionModel> {
    return this.transactionService.createTransaction(data, user.id);
  }

  @Mutation(() => TransactionModel)
  async updateTransaction(
    @Arg("id", () => String) id: string,
    @Arg("data", () => CreateTransactionInput) data: CreateTransactionInput,
    @GqlUser() user: UserModel
  ): Promise<TransactionModel> {
    return this.transactionService.updateTransaction(id, data, user.id);
  }

  @Mutation(() => [TransactionModel])
  async createInstallmentPurchase(
    @Arg("data", () => CreateInstallmentPurchaseInput) data: CreateInstallmentPurchaseInput,
    @GqlUser() user: UserModel
  ): Promise<TransactionModel[]> {
    return this.transactionService.createInstallmentPurchase(data, user.id);
  }

  @Mutation(() => TransactionModel)
  async deleteTransaction(
    @Arg("id", () => String) id: string,
    @GqlUser() user: UserModel
  ): Promise<TransactionModel> {
    return this.transactionService.deleteTransaction(id, user.id);
  }

  @Query(() => TransactionModel)
  async getTransactionById(
    @Arg("id", () => String) id: string,
    @GqlUser() user: UserModel
  ): Promise<TransactionModel> {
    return this.transactionService.findTransaction(id, user.id);
  }

  @Query(() => [TransactionModel])
  async listTransactions(
    @Arg("environmentId", () => String) environmentId: string,
    @GqlUser() user: UserModel
  ): Promise<TransactionModel[]> {
    return this.transactionService.listTransactions(environmentId, user.id);
  }

  @FieldResolver(() => CategoryModel)
  async category(
    @Root() transaction: TransactionModel,
    @GqlUser() user: UserModel
  ): Promise<CategoryModel> {
    return this.categoryService.findCategory(transaction.categoryId, user.id);
  }

  @FieldResolver(() => EnvironmentMemberModel)
  async member(@Root() transaction: TransactionModel): Promise<EnvironmentMemberModel> {
    const member = await prismaClient.environmentMember.findUnique({
      where: { id: transaction.memberId },
    });
    if (!member) throw new Error("Membro não encontrado.");

    return member;
  }

  @FieldResolver(() => UserModel, { name: "createdBy" })
  async createdByUser(@Root() transaction: TransactionModel): Promise<UserModel> {
    const user = await prismaClient.user.findUnique({
      where: { id: transaction.createdBy },
    });
    if (!user) throw new Error("Usuário não encontrado.");

    return user;
  }
}
