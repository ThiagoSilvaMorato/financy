import { Arg, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";
import { IsAuth } from "../middleware/auth.middleware";
import { CreateCategoryInput } from "../dto/input/category.input";
import { CategoryService } from "../services/category.service";
import { CategoryModel } from "../models/category.model";
import { GqlUser } from "../graphql/decorators/user.decorator";
import { UserModel } from "../models/user.model";

@Resolver(() => CategoryModel)
@UseMiddleware(IsAuth)
export class CategoryResolver {
  private categoryService = new CategoryService();

  @Mutation(() => CategoryModel)
  async createCategory(
    @Arg("data", () => CreateCategoryInput) data: CreateCategoryInput,
    @GqlUser() user: UserModel
  ): Promise<CategoryModel> {
    return this.categoryService.createCategory(data, user.id);
  }

  @Mutation(() => CategoryModel)
  async updateCategory(
    @Arg("id", () => String) id: string,
    @Arg("data", () => CreateCategoryInput) data: CreateCategoryInput,
    @GqlUser() user: UserModel
  ): Promise<CategoryModel> {
    return this.categoryService.updateCategory(id, data, user.id);
  }

  @Mutation(() => CategoryModel)
  async deleteCategory(
    @Arg("id", () => String) id: string,
    @GqlUser() user: UserModel
  ): Promise<CategoryModel> {
    return this.categoryService.deleteCategory(id, user.id);
  }

  @Query(() => CategoryModel)
  async getCategoryById(
    @Arg("id", () => String) id: string,
    @GqlUser() user: UserModel
  ): Promise<CategoryModel> {
    return this.categoryService.findCategory(id, user.id);
  }

  @Query(() => [CategoryModel])
  async listCategories(@GqlUser() user: UserModel): Promise<CategoryModel[]> {
    return this.categoryService.listCategories(user.id);
  }
}
