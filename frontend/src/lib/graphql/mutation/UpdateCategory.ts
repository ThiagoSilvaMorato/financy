import { gql } from "@apollo/client";

export const UPDATE_CATEGORY = gql`
  mutation UpdateCategory($data: CreateCategoryInput!, $updateCategoryId: String!) {
    updateCategory(data: $data, id: $updateCategoryId) {
      id
      title
      description
      icon
      color
      updatedAt
    }
  }
`;
