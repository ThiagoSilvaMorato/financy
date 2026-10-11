import { prismaClient } from "../../prisma/prisma";
import { CreateCategoryInput } from "../dto/input/category.input";
import { assertEnvironmentAccess } from "../utils/environment-access";

export class CategoryService {
  async createCategory(data: CreateCategoryInput, userId: string) {
    await assertEnvironmentAccess(data.environmentId, userId);

    const findCategory = await prismaClient.category.findUnique({
      where: { environmentId_title: { environmentId: data.environmentId, title: data.title } },
    });
    if (findCategory) throw new Error("Categoria já cadastrada.");

    const category = await prismaClient.category.create({
      data: {
        title: data.title,
        description: data.description,
        icon: data.icon,
        color: data.color,
        environmentId: data.environmentId,
      },
    });

    return category;
  }

  async findCategory(id: string, userId: string) {
    const category = await prismaClient.category.findUnique({
      where: { id },
    });
    if (!category) throw new Error("Categoria não existe");

    await assertEnvironmentAccess(category.environmentId, userId);

    return category;
  }

  async listCategories(environmentId: string, userId: string) {
    await assertEnvironmentAccess(environmentId, userId);

    const categories = await prismaClient.category.findMany({
      where: { environmentId },
    });

    return categories;
  }

  async updateCategory(id: string, data: CreateCategoryInput, userId: string) {
    const findCategory = await prismaClient.category.findUnique({
      where: { id },
    });
    if (!findCategory) throw new Error("Categoria não encontrada.");

    // environmentId vem da categoria já persistida, nunca do input do client.
    await assertEnvironmentAccess(findCategory.environmentId, userId);

    const category = await prismaClient.category.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        icon: data.icon,
        color: data.color,
      },
    });

    return category;
  }

  async deleteCategory(id: string, userId: string) {
    const findCategory = await prismaClient.category.findUnique({
      where: { id },
    });
    if (!findCategory) throw new Error("Categoria não encontrada.");

    await assertEnvironmentAccess(findCategory.environmentId, userId);

    await prismaClient.$transaction([
      prismaClient.transaction.deleteMany({
        where: { categoryId: id },
      }),
      prismaClient.category.delete({
        where: { id },
      }),
    ]);

    return findCategory;
  }

  async countTransactions(categoryId: string): Promise<number> {
    const count = await prismaClient.transaction.count({
      where: { categoryId },
    });

    return count;
  }

  async totalAmount(categoryId: string): Promise<string> {
    const transactions = await prismaClient.transaction.findMany({
      where: { categoryId },
      select: {
        amount: true,
        type: true,
      },
    });

    if (!transactions || transactions.length === 0) return "0.00";

    let total = 0;

    for (const tx of transactions) {
      const rawStr = String(tx.amount ?? "0").trim();

      let normalized = rawStr;
      if (rawStr.includes(".") && rawStr.includes(",")) {
        normalized = rawStr.replace(/\./g, "").replace(",", ".");
      } else if (rawStr.includes(",")) {
        normalized = rawStr.replace(",", ".");
      }

      const value = parseFloat(normalized);
      if (isNaN(value)) continue;

      if (tx.type === "income") {
        total += value;
      } else {
        total -= value;
      }
    }

    return total.toFixed(2);
  }
}
