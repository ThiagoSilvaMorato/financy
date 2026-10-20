import { gql } from "@apollo/client";

export const CREATE_INSTALLMENT_PURCHASE = gql`
  mutation CreateInstallmentPurchase($data: CreateInstallmentPurchaseInput!) {
    createInstallmentPurchase(data: $data) {
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
