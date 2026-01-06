import { prismaClient } from "../../prisma/prisma";
import { LoginInput, RefreshTokenInput, RegisterInput } from "../dto/input/auth.input";
import { UserModel } from "../models/user.model";
import { comparePassword, hashPassword } from "../utils/hash";
import { signJwt, verifyJwt } from "../utils/jwt";

export class AuthService {
  async login(data: LoginInput) {
    const existingUser = await prismaClient.user.findUnique({
      where: { email: data.email },
    });
    if (!existingUser) throw new Error("E-mail ou senha inválidos.");

    const isPasswordValid = await comparePassword(data.password, existingUser.password);
    if (!isPasswordValid) throw new Error("E-mail ou senha inválidos.");
    console.log(existingUser, isPasswordValid);

    return this.generateTokens(existingUser, data.rememberMe);
  }

  async refreshToken(data: RefreshTokenInput) {
    let decoded: any;
    try {
      decoded = verifyJwt(data.refreshToken);
    } catch (err) {
      throw new Error("Token inválido.");
    }
    if (!decoded) throw new Error("Token inválido.");

    if (decoded.type !== "refresh") throw new Error("Token de refresh inválido.");

    const user = await prismaClient.user.findUnique({
      where: { id: decoded.id },
    });
    if (!user) throw new Error("Usuário não encontrado.");

    const remember = Boolean(decoded.rememberMe);
    return this.generateTokens(user, remember);
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
    const accessTokenExpiry = "5s";
    const refreshTokenExpiry = rememberMe ? "7d" : "8h";

    const token = signJwt(
      {
        id: user.id,
        email: user.email,
        type: "access",
      },
      accessTokenExpiry
    );
    const refreshToken = signJwt(
      {
        id: user.id,
        email: user.email,
        type: "refresh",
        rememberMe,
      },
      refreshTokenExpiry
    );

    return { token, refreshToken, user };
  }
}
