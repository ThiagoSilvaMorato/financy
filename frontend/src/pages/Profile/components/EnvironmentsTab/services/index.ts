import { apolloClient } from "@/lib/graphql/apollo";
import { LIST_MY_PENDING_INVITES } from "@/lib/graphql/queries/Environment";
import {
  ACCEPT_ENVIRONMENT_INVITE,
  CREATE_ENVIRONMENT,
  DECLINE_ENVIRONMENT_INVITE,
} from "@/lib/graphql/mutation/Environment";
import type { EnvironmentInviteModel, EnvironmentModel } from "@/shared/models/environment";

interface ListMyPendingInvitesData {
  listMyPendingInvites: EnvironmentInviteModel[];
}

interface CreateEnvironmentMutationData {
  createEnvironment: EnvironmentModel;
}

export const environmentsTabService = {
  listMyPendingInvites: async () => {
    return await apolloClient.query<ListMyPendingInvitesData>({
      query: LIST_MY_PENDING_INVITES,
      fetchPolicy: "no-cache",
    });
  },

  createEnvironment: async (name: string) => {
    return await apolloClient.mutate<
      CreateEnvironmentMutationData,
      { data: { name: string } }
    >({
      mutation: CREATE_ENVIRONMENT,
      variables: { data: { name } },
    });
  },

  acceptEnvironmentInvite: async (inviteId: string) => {
    return await apolloClient.mutate<{ acceptEnvironmentInvite: boolean }>({
      mutation: ACCEPT_ENVIRONMENT_INVITE,
      variables: { inviteId },
    });
  },

  declineEnvironmentInvite: async (inviteId: string) => {
    return await apolloClient.mutate<{ declineEnvironmentInvite: boolean }>({
      mutation: DECLINE_ENVIRONMENT_INVITE,
      variables: { inviteId },
    });
  },
};
