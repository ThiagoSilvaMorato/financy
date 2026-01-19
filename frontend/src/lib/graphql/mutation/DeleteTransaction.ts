import { gql } from "@apollo/client";

export const DELETE_TRANSACTION = gql`
  mutation DeleteTransaction($deleteTransactionId: String!) {
    deleteTransaction(id: $deleteTransactionId) {
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
