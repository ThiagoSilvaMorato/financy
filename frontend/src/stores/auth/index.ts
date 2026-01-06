import { env } from "@/env";
import type { LoginInput, RegisterInput, User } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { print } from "graphql";
import { apolloClient } from "@/lib/graphql/apollo";
import { REGISTER } from "@/lib/graphql/mutation/Register";
import { LOGIN } from "@/lib/graphql/mutation/Login";
import { REFRESH_TOKEN } from "@/lib/graphql/mutation/RefreshToken";

type RegisterMutationData = {
  register: {
    token: string;
    refreshToken: string;
    user: User;
  };
};

type LoginMutationData = {
  login: {
    token: string;
    refreshToken: string;
    user: User;
  };
};

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  signup: (data: RegisterInput) => Promise<boolean>;
  login: (data: LoginInput) => Promise<boolean>;
  logout: () => Promise<boolean>;
  updateUser: (data: Partial<User>) => void;
  refreshSession: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : state.user,
        }));
      },

      login: async (loginData: LoginInput) => {
        try {
          const { data } = await apolloClient.mutate<LoginMutationData, { data: LoginInput }>({
            mutation: LOGIN,
            variables: {
              data: {
                email: loginData.email,
                password: loginData.password,
                rememberMe: loginData.rememberMe,
              },
            },
          });

          if (data?.login) {
            const { token, refreshToken, user } = data.login;

            set({
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
              },
              token,
              refreshToken,
              isAuthenticated: true,
            });
            return true;
          }

          return false;
        } catch (error) {
          console.error("Login error:", error);
          throw error;
        }
      },

      signup: async (registerData: RegisterInput) => {
        try {
          const { data } = await apolloClient.mutate<RegisterMutationData, { data: RegisterInput }>(
            {
              mutation: REGISTER,
              variables: {
                data: {
                  name: registerData.name,
                  email: registerData.email,
                  password: registerData.password,
                },
              },
            }
          );

          if (data?.register) {
            const { token, refreshToken, user } = data.register;

            set({
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
              },
              token,
              refreshToken,
              isAuthenticated: true,
            });
            return true;
          }
          return false;
        } catch (error) {
          console.error("Signup error:", error);
          throw error;
        }
      },

      logout: async () => {
        try {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
          });

          if (typeof window !== "undefined" && window.localStorage) {
            try {
              window.localStorage.removeItem("auth-storage");
            } catch {
              console.error("localStorage remove error during logout");
            }
          }

          try {
            await apolloClient.resetStore();
          } catch (e) {
            console.error("Apollo reset error during logout:", e);
          }

          return true;
        } catch (error) {
          console.error("Logout error:", error);
          return false;
        }
      },

      refreshSession: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          get().logout();
          return null;
        }

        try {
          const response = await fetch(env.VITE_BACKEND_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: print(REFRESH_TOKEN),
              variables: {
                data: {
                  refreshToken: refreshToken,
                },
              },
            }),
          });

          const { data, errors } = await response.json();

          if (errors || !data?.refreshToken) {
            get().logout();
            return null;
          }

          const { token: newToken, refreshToken: newRefreshToken } = data.refreshToken;
          set({ token: newToken, refreshToken: newRefreshToken });
          return newToken;
        } catch {
          get().logout();
          return null;
        }
      },
    }),
    {
      name: "auth-storage",
    }
  )
);
