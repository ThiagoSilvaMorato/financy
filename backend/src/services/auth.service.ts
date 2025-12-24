import { prismaClient } from "../../prisma/prisma";
import { LoginInput, RegisterInput } from "../dto/input/auth.input";
import { UserModel } from "../models/user.model";
import { comparePassword, hashPassword } from "../utils/hash";
import { signJwt } from "../utils/jwt";

export class AuthService {
  async login(data: LoginInput) {
    const existingUser = await prismaClient.user.findUnique({
      where: { email: data.email },
    });
    if (!existingUser) throw new Error("E-mail ou senha inválidos.");

    const isPasswordValid = comparePassword(data.password, existingUser.password);
    if (!isPasswordValid) throw new Error("E-mail ou senha inválidos.");

    return this.generateTokens(existingUser);
  }

  async register(data: RegisterInput) {
    const existingUser = await prismaClient.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) throw new Error("E-mail já cadastrado.");

    const hashedPassword = await hashPassword(data.password);

    const user = await prismaClient.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
      },
    });

    return this.generateTokens(user);
  }

  generateTokens(user: UserModel) {
    const token = signJwt(
      {
        id: user.id,
        email: user.email,
      },
      "15m"
    );
    const refreshToken = signJwt(
      {
        id: user.id,
        email: user.email,
      },
      "15m"
    );

    return { token, refreshToken, user };
  }
}
