import { Arg, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";
import { UserModel } from "../models/user.model";
import { UserService } from "../services/user.service";
import { IsAuth } from "../middleware/auth.middleware";
import { CreateUserInput } from "../dto/input/user.input";

@Resolver(() => UserModel)
@UseMiddleware(IsAuth)
export class UserResolver {
  private userService = new UserService();

  @Mutation(() => UserModel)
  async createUser(@Arg("data", () => CreateUserInput) data: CreateUserInput): Promise<UserModel> {
    return this.userService.createUser(data);
  }

  @Mutation(() => UserModel)
  async updateUser(@Arg("data", () => CreateUserInput) data: CreateUserInput): Promise<UserModel> {
    return this.userService.updateUser(data);
  }

  @Query(() => UserModel)
  async getUser(@Arg("id", () => String) id: string): Promise<UserModel> {
    return this.userService.findUser(id);
  }
}
