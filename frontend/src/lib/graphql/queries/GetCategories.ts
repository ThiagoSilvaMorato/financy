import { gql } from "@apollo/client";

export const GET_CATEGORY = gql`
  query GetCategories {
    listCategories {
      id
      title
      description
      icon
      color
      transactionsCount
    }
  }
`;
