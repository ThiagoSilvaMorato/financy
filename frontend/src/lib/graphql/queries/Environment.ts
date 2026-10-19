import { gql } from "@apollo/client";

export const LIST_MY_ENVIRONMENTS = gql`
  query ListMyEnvironments {
    listMyEnvironments {
      id
      name
      isPersonal
      createdAt
      updatedAt
      members {
        id
        environmentId
        userId
        role
        displayName
        joinedAt
        removedAt
        user {
          id
          name
          email
        }
      }
      pendingMembers {
        id
        environmentId
        userId
        role
        displayName
        joinedAt
        removedAt
        user {
          id
          name
          email
        }
      }
      myMembership {
        id
        role
      }
    }
  }
`;

export const GET_CURRENT_INVITE_CODE = gql`
  query GetCurrentInviteCode($environmentId: String!) {
    getCurrentInviteCode(environmentId: $environmentId) {
      environmentId
      code
      expiresAt
      createdAt
    }
  }
`;

export const GET_ENVIRONMENT_BY_INVITE_CODE = gql`
  query GetEnvironmentByInviteCode($code: String!) {
    getEnvironmentByInviteCode(code: $code) {
      id
      name
    }
  }
`;
