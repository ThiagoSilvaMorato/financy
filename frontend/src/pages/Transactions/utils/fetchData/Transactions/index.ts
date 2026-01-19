import { apolloClient } from "@/lib/graphql/apollo";
import { GET_TRANSACTION } from "@/lib/graphql/queries/GetTransactions";
import type { TransactionModel } from "@/pages/Transactions/models";
import type { Dispatch, SetStateAction } from "react";
import type { GetTransactionQueryData } from "./models";

export async function fetchTransactionData(setValue: Dispatch<SetStateAction<TransactionModel[]>>) {
  const { data } = await apolloClient.query<GetTransactionQueryData>({
    query: GET_TRANSACTION,
    fetchPolicy: "no-cache",
  });

  setValue(data?.listTransactions || []);
}
