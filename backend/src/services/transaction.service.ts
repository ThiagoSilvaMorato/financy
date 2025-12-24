import { prismaClient } from "../../prisma/prisma";
import { CreateTransactionInput } from "../dto/input/transaction.input";

export class TransactionService {
  async createTransaction(data: CreateTransactionInput, userId: string) {
    if (data.type !== "income" && data.type !== "expense")
      throw new Error("Tipo de transação inválido.");

    const transaction = await prismaClient.transaction.create({
      data: {
        type: data.type,
        description: data.description,
        date: data.date,
        amount: data.amount,
        category: { connect: { id: data.categoryId } },
        user: { connect: { id: userId } },
      },
    });

    return transaction;
  }

  async updateTransaction(id: string, data: CreateTransactionInput, userId: string) {
    if (data.type !== "income" && data.type !== "expense")
      throw new Error("Tipo de transação inválido.");

    const findTransaction = await prismaClient.transaction.findUnique({
      where: { id, userId },
    });

    if (!findTransaction || findTransaction.userId !== userId)
      throw new Error("Transação não encontrada.");

    const transaction = await prismaClient.transaction.update({
      where: { id },
      data: {
        type: data.type,
        description: data.description,
        date: data.date,
        amount: data.amount,
        category: { connect: { id: data.categoryId } },
        user: { connect: { id: userId } },
      },
    });

    return transaction;
  }

  async findTransaction(id: string, userId: string) {
    const transaction = await prismaClient.transaction.findUnique({
      where: { id },
    });

    if (!transaction || transaction.userId !== userId) throw new Error("Usuário não existe");

    return transaction;
  }

  async listTransactions(userId: string) {
    const transactions = await prismaClient.transaction.findMany({
      where: { userId },
    });

    return transactions;
  }

  async deleteTransaction(id: string, userId: string) {
    const findTransaction = await prismaClient.transaction.findUnique({
      where: { id, userId },
    });

    if (!findTransaction || findTransaction.userId !== userId)
      throw new Error("Transação não encontrada.");

    const transaction = await prismaClient.transaction.delete({
      where: { id },
    });

    return transaction;
  }
}
