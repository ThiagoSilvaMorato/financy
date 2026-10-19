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
    }
  }
`;

export const LIST_MY_PENDING_INVITES = gql`
  query ListMyPendingInvites {
    listMyPendingInvites {
      id
      environmentId
      role
      status
      expiresAt
      createdAt
      environment {
        id
        name
        isPersonal
      }
      invitedBy {
        id
        name
        email
      }
    }
  }
`;

export const LIST_ENVIRONMENT_INVITES = gql`
  query ListEnvironmentInvites($environmentId: String!) {
    listEnvironmentInvites(environmentId: $environmentId) {
      id
      environmentId
      role
      status
      expiresAt
      createdAt
      environment {
        id
        name
        isPersonal
      }
      invitedBy {
        id
        name
        email
      }
      invitedUser {
        id
        name
        email
      }
    }
  }
`;
