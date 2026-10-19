import { gql } from "@apollo/client";

export const GET_CATEGORY = gql`
  query GetCategories($environmentId: String!) {
    listCategories(environmentId: $environmentId) {
      id
      title
      description
      icon
      color
      transactionsCount
      totalAmount
    }
  }
`;
