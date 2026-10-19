import { apolloClient } from "@/lib/graphql/apollo";
import {
  GET_ENVIRONMENT_BY_INVITE_CODE,
} from "@/lib/graphql/queries/Environment";
import {
  CREATE_ENVIRONMENT,
  JOIN_ENVIRONMENT_BY_CODE,
} from "@/lib/graphql/mutation/Environment";
import type { EnvironmentModel } from "@/shared/models/environment";

interface CreateEnvironmentMutationData {
  createEnvironment: EnvironmentModel;
}

export const environmentsTabService = {
  createEnvironment: async (name: string) => {
    return await apolloClient.mutate<
      CreateEnvironmentMutationData,
      { data: { name: string } }
    >({
      mutation: CREATE_ENVIRONMENT,
      variables: { data: { name } },
    });
  },

  getEnvironmentByInviteCode: async (code: string) => {
    return await apolloClient.query<{ getEnvironmentByInviteCode: EnvironmentModel }>({
      query: GET_ENVIRONMENT_BY_INVITE_CODE,
      variables: { code },
      fetchPolicy: "no-cache",
    });
  },

  joinEnvironmentByCode: async (code: string) => {
    return await apolloClient.mutate<{ joinEnvironmentByCode: EnvironmentModel }>({
      mutation: JOIN_ENVIRONMENT_BY_CODE,
      variables: { code },
    });
  },
};
