import { gql } from "@apollo/client";

export const USER = gql`
  mutation User($data: CreateUserInput!) {
    updateUser(data: $data) {
      id
      name
      email
      createdAt
      updatedAt
    }
  }
`;
