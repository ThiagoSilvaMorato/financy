import { gql } from "@apollo/client";

export const RECOVER_PASSWORD = gql`
  mutation RecoverPassword($data: RecoverPasswordInput!) {
    recoverPassword(data: $data)
  }
`;
