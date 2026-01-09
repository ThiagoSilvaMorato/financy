import { prismaClient } from "../../prisma/prisma";
import { LoginInput, RefreshTokenInput, RegisterInput } from "../dto/input/auth.input";
import { UserModel } from "../models/user.model";
import { comparePassword, hashPassword } from "../utils/hash";
import { signJwt, verifyJwt } from "../utils/jwt";
import crypto from "node:crypto";
import { EmailService } from "./email.service";
import { inject, singleton } from "tsyringe";

@singleton()
export class AuthService {
  constructor(@inject(EmailService) private emailService: EmailService) {}

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
    const accessTokenExpiry = "15m";
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

  async recoverPassword(email: string) {
    const user = await prismaClient.user.findUnique({
      where: { email },
    });

    if (!user) {
      return true;
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 1000 * 60 * 15);

    await prismaClient.user.update({
      where: { id: user.id },
      data: {
        resetCode: code,
        resetCodeExpiry: expiry,
      },
    });

    await this.emailService.sendForgotPasswordEmail(email, code);

    return true;
  }

  async resetPassword(email: string, code: string, password: string, confirmPassword: string) {
    const user = await prismaClient.user.findUnique({
      where: { email },
    });

    if (
      !user ||
      !user.resetCode ||
      !user.resetCodeExpiry ||
      user.resetCode !== code ||
      user.resetCodeExpiry < new Date() ||
      password !== confirmPassword
    ) {
      throw new Error("Invalid or expired code");
    }

    const hash = await hashPassword(password);

    await prismaClient.user.update({
      where: { id: user.id },
      data: {
        password: hash,
        resetCode: null,
        resetCodeExpiry: null,
      },
    });

    return true;
  }
}
