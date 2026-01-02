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

    return this.generateTokens(existingUser, data.rememberMe);
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

  generateTokens(user: UserModel, rememberMe = false) {
    const accessTokenExpiry = "15m";
    const refreshTokenExpiry = rememberMe ? "7d" : "8h";

    const token = signJwt(
      {
        id: user.id,
        email: user.email,
      },
      accessTokenExpiry
    );
    const refreshToken = signJwt(
      {
        id: user.id,
        email: user.email,
      },
      refreshTokenExpiry
    );

    return { token, refreshToken, user };
  }
}
