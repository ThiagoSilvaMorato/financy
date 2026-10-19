import { apolloClient } from "@/lib/graphql/apollo";
import { GET_CURRENT_INVITE_CODE } from "@/lib/graphql/queries/Environment";
import {
  APPROVE_MEMBER,
  CREATE_PARTICIPANT,
  DELETE_ENVIRONMENT,
  GENERATE_ENVIRONMENT_INVITE_CODE,
  LEAVE_ENVIRONMENT,
  PROMOTE_TO_ADMIN,
  REMOVE_MEMBER,
  REMOVE_PARTICIPANT,
  RENAME_ENVIRONMENT,
  SET_DEFAULT_ENVIRONMENT,
} from "@/lib/graphql/mutation/Environment";
import type { EnvironmentInviteCodeModel, EnvironmentMemberModel } from "@/shared/models/environment";

export const environmentManagementService = {
  getCurrentInviteCode: async (environmentId: string) => {
    return await apolloClient.query<{ getCurrentInviteCode: EnvironmentInviteCodeModel | null }>({
      query: GET_CURRENT_INVITE_CODE,
      variables: { environmentId },
      fetchPolicy: "no-cache",
    });
  },

  generateEnvironmentInviteCode: async (environmentId: string) => {
    return await apolloClient.mutate<{ generateEnvironmentInviteCode: EnvironmentInviteCodeModel }>({
      mutation: GENERATE_ENVIRONMENT_INVITE_CODE,
      variables: { environmentId },
    });
  },

  approveMember: async (environmentId: string, memberId: string) => {
    return await apolloClient.mutate<{ approveMember: EnvironmentMemberModel }>({
      mutation: APPROVE_MEMBER,
      variables: { environmentId, memberId },
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
