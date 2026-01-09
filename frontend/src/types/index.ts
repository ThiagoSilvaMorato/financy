export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface UpdateUserInput {
  name: string;
  email: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface RecoverPasswordInput {
  email: string;
  password: string;
  confirmPassword: string;
  code: string;
}
