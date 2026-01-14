import { prismaClient } from "../../prisma/prisma";
import { CreateCategoryInput } from "../dto/input/category.input";

export class CategoryService {
  async createCategory(data: CreateCategoryInput, userId: string) {
    const findCategory = await prismaClient.category.findUnique({
      where: { userId_title: { userId: userId, title: data.title } },
    });
    if (findCategory) throw new Error("Categoria já cadastrada.");

    const category = await prismaClient.category.create({
      data: {
        title: data.title,
        description: data.description,
        icon: data.icon,
        color: data.color,
        userId: userId,
      },
    });

    return category;
  }

  async findCategory(id: string, userId: string) {
    const category = await prismaClient.category.findUnique({
      where: { id },
    });

    if (!category || category.userId !== userId) throw new Error("Categoria não existe");

    return category;
  }

  async listCategories(userId: string) {
    const categories = await prismaClient.category.findMany({
      where: { userId },
    });

    return categories;
  }

  async updateCategory(id: string, data: CreateCategoryInput, userId: string) {
    const findCategory = await prismaClient.category.findUnique({
      where: { id, userId },
    });

    if (!findCategory) throw new Error("Categoria não encontrada.");

    const category = await prismaClient.category.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        icon: data.icon,
        color: data.color,
        userId: userId,
      },
    });

    return category;
  }

  async deleteCategory(id: string, userId: string) {
    const findCategory = await prismaClient.category.findUnique({
      where: { id },
    });

    if (!findCategory || findCategory.userId !== userId)
      throw new Error("Categoria não encontrada.");

    await prismaClient.$transaction([
      prismaClient.transaction.deleteMany({
        where: {
          categoryId: id,
          userId: userId,
        },
      }),
      prismaClient.category.delete({
        where: { id },
      }),
    ]);

    return findCategory;
  }

  async countTransactions(categoryId: string, userId: string): Promise<number> {
    const count = await prismaClient.transaction.count({
      where: {
        categoryId: categoryId,
        userId: userId,
      },
    });

    return count;
  }
}
