import { gql } from "@apollo/client";

export const CREATE_ENVIRONMENT = gql`
  mutation CreateEnvironment($data: CreateEnvironmentInput!) {
    createEnvironment(data: $data) {
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

export const RENAME_ENVIRONMENT = gql`
  mutation RenameEnvironment($environmentId: String!, $name: String!) {
    renameEnvironment(environmentId: $environmentId, name: $name) {
      id
      name
    }
  }
`;

export const DELETE_ENVIRONMENT = gql`
  mutation DeleteEnvironment($environmentId: String!) {
    deleteEnvironment(environmentId: $environmentId)
  }
`;

export const LEAVE_ENVIRONMENT = gql`
  mutation LeaveEnvironment($environmentId: String!, $newAdminMemberId: String) {
    leaveEnvironment(environmentId: $environmentId, newAdminMemberId: $newAdminMemberId)
  }
`;

export const PROMOTE_TO_ADMIN = gql`
  mutation PromoteToAdmin($environmentId: String!, $memberId: String!) {
    promoteToAdmin(environmentId: $environmentId, memberId: $memberId) {
      id
      role
    }
  }
`;

export const REMOVE_MEMBER = gql`
  mutation RemoveMember($environmentId: String!, $memberId: String!) {
    removeMember(environmentId: $environmentId, memberId: $memberId) {
      id
      removedAt
    }
  }
`;

export const CREATE_PARTICIPANT = gql`
  mutation CreateParticipant($data: CreateParticipantInput!) {
    createParticipant(data: $data) {
      id
      environmentId
      displayName
      joinedAt
    }
  }
`;

export const REMOVE_PARTICIPANT = gql`
  mutation RemoveParticipant($environmentId: String!, $memberId: String!) {
    removeParticipant(environmentId: $environmentId, memberId: $memberId) {
      id
      removedAt
    }
  }
`;

export const GENERATE_ENVIRONMENT_INVITE_CODE = gql`
  mutation GenerateEnvironmentInviteCode($environmentId: String!) {
    generateEnvironmentInviteCode(environmentId: $environmentId) {
      environmentId
      code
      expiresAt
      createdAt
    }
  }
`;

export const JOIN_ENVIRONMENT_BY_CODE = gql`
  mutation JoinEnvironmentByCode($code: String!) {
    joinEnvironmentByCode(code: $code) {
      id
      name
    }
  }
`;

export const APPROVE_MEMBER = gql`
  mutation ApproveMember($environmentId: String!, $memberId: String!) {
    approveMember(environmentId: $environmentId, memberId: $memberId) {
      id
      role
    }
  }
`;

export const SET_DEFAULT_ENVIRONMENT = gql`
  mutation SetDefaultEnvironment($environmentId: String!) {
    setDefaultEnvironment(environmentId: $environmentId)
  }
`;
