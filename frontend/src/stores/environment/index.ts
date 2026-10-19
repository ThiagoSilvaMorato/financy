import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apolloClient } from "@/lib/graphql/apollo";
import { LIST_MY_ENVIRONMENTS } from "@/lib/graphql/queries/Environment";
import type { EnvironmentModel } from "@/shared/models/environment";

interface ListMyEnvironmentsData {
  listMyEnvironments: EnvironmentModel[];
}

interface EnvironmentState {
  currentEnvironmentId: string | null;
  environments: EnvironmentModel[];
  switchEnvironment: (environmentId: string) => void;
  refreshEnvironments: () => Promise<EnvironmentModel[]>;
  reset: () => void;
}

export const useEnvironmentStore = create<EnvironmentState>()(
  persist(
    (set, get) => ({
      currentEnvironmentId: null,
      environments: [],

      switchEnvironment: (environmentId: string) => {
        set({ currentEnvironmentId: environmentId });
      },

      refreshEnvironments: async () => {
        try {
          const { data } = await apolloClient.query<ListMyEnvironmentsData>({
            query: LIST_MY_ENVIRONMENTS,
            fetchPolicy: "no-cache",
          });

          const environments = data?.listMyEnvironments || [];
          const { currentEnvironmentId } = get();

          const stillAccessible = environments.some((env) => env.id === currentEnvironmentId);
          const personalEnvironment = environments.find((env) => env.isPersonal);

          set({
            environments,
            currentEnvironmentId: stillAccessible
              ? currentEnvironmentId
              : personalEnvironment?.id ?? null,
          });

          return environments;
        } catch (error) {
          console.error("Erro ao buscar ambientes:", error);
          return get().environments;
        }
      },

      reset: () => {
        set({ currentEnvironmentId: null, environments: [] });
      },
    }),
    {
      name: "environment-storage",
    }
  )
);
