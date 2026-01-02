import type { LoginInput, RegisterInput, User } from "@/types";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apolloClient } from "@/lib/apollo";
import { REGISTER } from "@/lib/graphql/mutation/Register";
import { LOGIN } from "@/lib/graphql/mutation/Login";

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
  isAuthenticated: boolean;
  signup: (data: RegisterInput) => Promise<boolean>;
  login: (data: LoginInput) => Promise<boolean>;
  logout: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (loginData: LoginInput) => {
        try {
          const { data } = await apolloClient.mutate<LoginMutationData, { data: LoginInput }>({
            mutation: LOGIN,
            variables: {
              data: {
                email: loginData.email,
                password: loginData.password,
              },
            },
          });

          if (data?.login) {
            const { token, user } = data.login;

            set({
              user: {
                id: user.name,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
              },
              token,
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
            const { token, user } = data.register;

            set({
              user: {
                id: user.name,
                name: user.name,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
              },
              token,
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
          // clear local state
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });

          // remove persisted storage (same name used in persist options)
          if (typeof window !== "undefined" && window.localStorage) {
            try {
              window.localStorage.removeItem("auth-storage");
            } catch {
              console.error("localStorage remove error during logout");
            }
          }

          // reset apollo client cache/state
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
    }),
    {
      name: "auth-storage",
    }
  )
);
