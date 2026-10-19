import { prismaClient } from "../../prisma/prisma";
import { CreateTransactionInput } from "../dto/input/transaction.input";
import { assertEnvironmentAccess } from "../utils/environment-access";

async function assertMemberBelongsToEnvironment(memberId: string, environmentId: string) {
  const member = await prismaClient.environmentMember.findUnique({
    where: { id: memberId },
  });

  if (!member || member.environmentId !== environmentId || member.removedAt !== null) {
    throw new Error("Membro inválido para este ambiente.");
  }

  // Atribuir uma transação a alguém ainda não aprovado contradiz o propósito da aprovação.
  // Participantes (role: null) continuam válidos como alvo — só "pending" é bloqueado.
  if (member.role === "pending") {
    throw new Error("Não é possível atribuir uma transação a um membro ainda não aprovado.");
  }
}

export class TransactionService {
  async createTransaction(data: CreateTransactionInput, userId: string) {
    if (data.type !== "income" && data.type !== "expense")
      throw new Error("Tipo de transação inválido.");

    await assertEnvironmentAccess(data.environmentId, userId);
    await assertMemberBelongsToEnvironment(data.memberId, data.environmentId);

    const transaction = await prismaClient.transaction.create({
      data: {
        type: data.type,
        description: data.description,
        date: data.date,
        amount: data.amount,
        category: { connect: { id: data.categoryId } },
        environment: { connect: { id: data.environmentId } },
        member: { connect: { id: data.memberId } },
        createdByUser: { connect: { id: userId } },
      },
    });

    return transaction;
  }

  async updateTransaction(id: string, data: CreateTransactionInput, userId: string) {
    if (data.type !== "income" && data.type !== "expense")
      throw new Error("Tipo de transação inválido.");

    const findTransaction = await prismaClient.transaction.findUnique({
      where: { id },
    });
    if (!findTransaction) throw new Error("Transação não encontrada.");

    // environmentId vem da transação já persistida, nunca do input do client — evita mover a
    // transação para um ambiente que o input tenha informado sem revalidação.
    await assertEnvironmentAccess(findTransaction.environmentId, userId);
    await assertMemberBelongsToEnvironment(data.memberId, findTransaction.environmentId);

    const transaction = await prismaClient.transaction.update({
      where: { id },
      data: {
        type: data.type,
        description: data.description,
        date: data.date,
        amount: data.amount,
        category: { connect: { id: data.categoryId } },
        member: { connect: { id: data.memberId } },
      },
    });

    return transaction;
  }

  async findTransaction(id: string, userId: string) {
    const transaction = await prismaClient.transaction.findUnique({
      where: { id },
    });
    if (!transaction) throw new Error("Transação não encontrada.");

    await assertEnvironmentAccess(transaction.environmentId, userId);

    return transaction;
  }

  async listTransactions(environmentId: string, userId: string) {
    await assertEnvironmentAccess(environmentId, userId);

    const transactions = await prismaClient.transaction.findMany({
      where: { environmentId },
      orderBy: { createdAt: "desc" },
    });

    return transactions;
  }

  async deleteTransaction(id: string, userId: string) {
    const findTransaction = await prismaClient.transaction.findUnique({
      where: { id },
    });
    if (!findTransaction) throw new Error("Transação não encontrada.");

    await assertEnvironmentAccess(findTransaction.environmentId, userId);

    const transaction = await prismaClient.transaction.delete({
      where: { id },
    });

    return transaction;
  }
}
