import { apolloClient } from "@/lib/graphql/apollo";
import { LIST_ENVIRONMENT_INVITES } from "@/lib/graphql/queries/Environment";
import {
  CANCEL_ENVIRONMENT_INVITE,
  CREATE_PARTICIPANT,
  DELETE_ENVIRONMENT,
  INVITE_MEMBER,
  LEAVE_ENVIRONMENT,
  PROMOTE_TO_ADMIN,
  REMOVE_MEMBER,
  REMOVE_PARTICIPANT,
  RENAME_ENVIRONMENT,
  SET_DEFAULT_ENVIRONMENT,
} from "@/lib/graphql/mutation/Environment";
import type { EnvironmentInviteModel, EnvironmentMemberModel } from "@/shared/models/environment";
import type { InviteMemberForm } from "../models";

interface ListEnvironmentInvitesData {
  listEnvironmentInvites: EnvironmentInviteModel[];
}

export const environmentManagementService = {
  listEnvironmentInvites: async (environmentId: string) => {
    return await apolloClient.query<ListEnvironmentInvitesData>({
      query: LIST_ENVIRONMENT_INVITES,
      variables: { environmentId },
      fetchPolicy: "no-cache",
    });
  },

  inviteMember: async (environmentId: string, formData: InviteMemberForm) => {
    return await apolloClient.mutate<{ inviteMember: EnvironmentInviteModel }>({
      mutation: INVITE_MEMBER,
      variables: { data: { environmentId, email: formData.email, role: formData.role } },
    });
  },

  cancelEnvironmentInvite: async (inviteId: string) => {
    return await apolloClient.mutate<{ cancelEnvironmentInvite: boolean }>({
      mutation: CANCEL_ENVIRONMENT_INVITE,
      variables: { inviteId },
    });
  },

  promoteToAdmin: async (environmentId: string, memberId: string) => {
    return await apolloClient.mutate<{ promoteToAdmin: EnvironmentMemberModel }>({
      mutation: PROMOTE_TO_ADMIN,
      variables: { environmentId, memberId },
    });
  },

  removeMember: async (environmentId: string, memberId: string) => {
    return await apolloClient.mutate<{ removeMember: EnvironmentMemberModel }>({
      mutation: REMOVE_MEMBER,
      variables: { environmentId, memberId },
    });
  },

  createParticipant: async (environmentId: string, displayName: string) => {
    return await apolloClient.mutate<{ createParticipant: EnvironmentMemberModel }>({
      mutation: CREATE_PARTICIPANT,
      variables: { data: { environmentId, displayName } },
    });
  },

  removeParticipant: async (environmentId: string, memberId: string) => {
    return await apolloClient.mutate<{ removeParticipant: EnvironmentMemberModel }>({
      mutation: REMOVE_PARTICIPANT,
      variables: { environmentId, memberId },
    });
  },

  renameEnvironment: async (environmentId: string, name: string) => {
    return await apolloClient.mutate<{ renameEnvironment: { id: string; name: string } }>({
      mutation: RENAME_ENVIRONMENT,
      variables: { environmentId, name },
    });
  },

  leaveEnvironment: async (environmentId: string, newAdminMemberId?: string) => {
    return await apolloClient.mutate<{ leaveEnvironment: boolean }>({
      mutation: LEAVE_ENVIRONMENT,
      variables: { environmentId, newAdminMemberId },
    });
  },

  deleteEnvironment: async (environmentId: string) => {
    return await apolloClient.mutate<{ deleteEnvironment: boolean }>({
      mutation: DELETE_ENVIRONMENT,
      variables: { environmentId },
    });
  },

  setDefaultEnvironment: async (environmentId: string) => {
    return await apolloClient.mutate<{ setDefaultEnvironment: boolean }>({
      mutation: SET_DEFAULT_ENVIRONMENT,
      variables: { environmentId },
    });
  },
};
