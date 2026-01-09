import { gql } from "@apollo/client";

export const GET_TRANSACTION = gql`
  query GetTransaction {
    listTransactions {
      id
      type
      description
      date
      amount
      category {
        id
        title
        description
        icon
        color
      }
    }
  }
`;
