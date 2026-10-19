import { gql } from "@apollo/client";

export const GET_TRANSACTION = gql`
  query GetTransaction($environmentId: String!) {
    listTransactions(environmentId: $environmentId) {
      id
      type
      description
      date
      amount
      memberId
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
