import { addMonths } from "date-fns";
import crypto from "node:crypto";
import { prismaClient } from "../../prisma/prisma";
import { CreateInstallmentPurchaseInput, CreateTransactionInput } from "../dto/input/transaction.input";
import { assertEnvironmentAccess } from "../utils/environment-access";
import { formatMoneyString, parseMoneyString } from "../utils/money";

const MIN_INSTALLMENTS_COUNT = 2;
const MAX_INSTALLMENTS_COUNT = 60;

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

  // Cria uma compra parcelada: materializa de uma vez as N transações reais (uma por mês), cada
  // uma já com date/amount/description definitivos — nenhuma tela existente precisa saber que
  // parcelamento existe. Editar/excluir uma parcela isolada reaproveita updateTransaction/
  // deleteTransaction sem mudança neles (fora de escopo: cancelar parcelas futuras em massa ou
  // editar o parcelamento inteiro — ver docs/plans/03-BACKEND-pagamento-credito.md).
  async createInstallmentPurchase(data: CreateInstallmentPurchaseInput, userId: string) {
    if (data.type !== "income" && data.type !== "expense")
      throw new Error("Tipo de transação inválido.");

    await assertEnvironmentAccess(data.environmentId, userId);
    await assertMemberBelongsToEnvironment(data.memberId, data.environmentId);

    const category = await prismaClient.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category || category.environmentId !== data.environmentId) {
      throw new Error("Categoria inválida para este ambiente.");
    }

    if (data.installmentsCount < MIN_INSTALLMENTS_COUNT) {
      throw new Error("Parcelamento precisa de pelo menos 2 parcelas — pra 1x, use Débito.");
    }
    if (data.installmentsCount > MAX_INSTALLMENTS_COUNT) {
      throw new Error("Máximo de 60 parcelas.");
    }

    const amountValue = parseMoneyString(data.amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      throw new Error("Valor inválido.");
    }

    // Dinheiro sempre em centavos inteiros (nunca float direto) — ver
    // docs/plans/03-BACKEND-pagamento-credito.md, seção "Dinheiro".
    let totalCents: number;
    let installmentCents: number;
    if (data.amountIsTotal) {
      totalCents = Math.round(amountValue * 100);
      installmentCents = Math.floor(totalCents / data.installmentsCount);
    } else {
      installmentCents = Math.round(amountValue * 100);
      totalCents = installmentCents * data.installmentsCount;
    }
    // Resto da divisão (quando não é exata) vai inteiro pra última parcela.
    const remainderCents = totalCents - installmentCents * data.installmentsCount;

    const totalAmount = formatMoneyString(totalCents / 100);
    const installmentAmount = formatMoneyString(installmentCents / 100);

    // Id gerado aqui (em vez de deixar o @default(uuid()) do schema gerar) pra poder referenciar
    // installmentPurchaseId nas N transações dentro do mesmo array de $transaction, sem precisar
    // de uma transação interativa fazendo até 60 round-trips sequenciais ao banco (arriscaria o
    // timeout padrão do Prisma para parcelamentos grandes).
    const installmentPurchaseId = crypto.randomUUID();
    const transactionsData = Array.from({ length: data.installmentsCount }, (_, k) => {
      const installmentNumber = k + 1;
      const isLastInstallment = installmentNumber === data.installmentsCount;
      const installmentCentsWithRemainder = isLastInstallment
        ? installmentCents + remainderCents
        : installmentCents;

      return {
        type: data.type,
        description: `${data.description} ${installmentNumber}/${data.installmentsCount}`,
        date: addMonths(data.startDate, k),
        amount: formatMoneyString(installmentCentsWithRemainder / 100),
        categoryId: data.categoryId,
        environmentId: data.environmentId,
        memberId: data.memberId,
        createdBy: userId,
        installmentPurchaseId,
        installmentNumber,
      };
    });

    // Mesmo padrão já usado em deleteEnvironment/deleteCategory: $transaction em array, atômico
    // (tudo ou nada).
    const [, transactions] = await prismaClient.$transaction([
      prismaClient.installmentPurchase.create({
        data: {
          id: installmentPurchaseId,
          description: data.description,
          type: data.type,
          totalAmount,
          installmentAmount,
          installmentsCount: data.installmentsCount,
          startDate: data.startDate,
          categoryId: data.categoryId,
          environmentId: data.environmentId,
          memberId: data.memberId,
          createdByUserId: userId,
        },
      }),
      prismaClient.transaction.createManyAndReturn({ data: transactionsData }),
    ]);

    // createManyAndReturn não garante a ordem das linhas devolvidas — ordenar explicitamente por
    // installmentNumber pra quem chama (ex.: o frontend) poder contar "N parcelas criadas" na
    // ordem certa sem precisar de uma query extra.
    return transactions.sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0));
  }
}
