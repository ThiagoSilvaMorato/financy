import { Arg, Mutation, Resolver } from "type-graphql";
import {
  RecoverPasswordInput,
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
  ResetPasswordInput,
} from "../dto/input/auth.input";
import { LoginOutput, RegisterOutput } from "../dto/output/auth.output";
import { AuthService } from "../services/auth.service";
import { EmailService } from "../services/email.service";

@Resolver()
export class AuthResolver {
  private emailService = new EmailService();
  private authService = new AuthService(this.emailService);

  @Mutation(() => LoginOutput)
  async login(@Arg("data", () => LoginInput) data: LoginInput): Promise<LoginOutput> {
    return this.authService.login(data);
  }

  @Mutation(() => LoginOutput)
  async refreshToken(
    @Arg("data", () => RefreshTokenInput) data: RefreshTokenInput
  ): Promise<LoginOutput> {
    return this.authService.refreshToken(data);
  }

  @Mutation(() => RegisterOutput)
  async register(@Arg("data", () => RegisterInput) data: RegisterInput): Promise<RegisterOutput> {
    return this.authService.register(data);
  }

  @Mutation(() => Boolean)
  async recoverPassword(
    @Arg("data", () => RecoverPasswordInput) data: RecoverPasswordInput
  ): Promise<boolean> {
    return this.authService.recoverPassword(data.email);
  }

  @Mutation(() => Boolean)
  async resetPassword(
    @Arg("data", () => ResetPasswordInput) data: ResetPasswordInput
  ): Promise<boolean> {
    return this.authService.resetPassword(
      data.email,
      data.code,
      data.password,
      data.confirmPassword
    );
  }
}
