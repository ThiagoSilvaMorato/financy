import { gql } from "@apollo/client";

export const UPDATE_TRANSACTION = gql`
  mutation UpdateTransaction($data: CreateTransactionInput!, $updateTransactionId: String!) {
    updateTransaction(data: $data, id: $updateTransactionId) {
      id
      type
      description
      date
      amount
      category {
        id
        title
        description
      }
    }
  }
`;
