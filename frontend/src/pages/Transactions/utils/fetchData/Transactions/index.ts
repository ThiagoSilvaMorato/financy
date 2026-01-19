import { apolloClient } from "@/lib/graphql/apollo";
import { GET_TRANSACTION } from "@/lib/graphql/queries/GetTransactions";
import type { Dispatch, SetStateAction } from "react";
import type { GetTransactionQueryData } from "./models";
import type { TransactionModel } from "@/shared/models/transaction";

export async function fetchTransactionData(setValue: Dispatch<SetStateAction<TransactionModel[]>>) {
  const { data } = await apolloClient.query<GetTransactionQueryData>({
    query: GET_TRANSACTION,
    fetchPolicy: "no-cache",
  });

  setValue(data?.listTransactions || []);
}
