import { apolloClient } from "@/lib/graphql/apollo";
import { GET_TRANSACTION } from "@/lib/graphql/queries/GetTransactions";
import type { Dispatch, SetStateAction } from "react";
import type { GetTransactionQueryData } from "./models";
import type { TransactionModel } from "@/shared/models/transaction";
import type { TransactionFilterModel } from "@/pages/Transactions/models";

export async function fetchTransactionData(
  setValue: Dispatch<SetStateAction<TransactionModel[]>>,
  filter?: TransactionFilterModel
) {
  const { data } = await apolloClient.query<GetTransactionQueryData>({
    query: GET_TRANSACTION,
    fetchPolicy: "no-cache",
  });

  let filteredTransactions = data?.listTransactions || [];
  if (filter) {
    if (filter.description) {
      filteredTransactions = filteredTransactions.filter((transaction) =>
        transaction.description.toLowerCase().includes(filter.description!.toLowerCase())
      );
    }

    if (filter.type && filter.type !== "all") {
      filteredTransactions = filteredTransactions.filter(
        (transaction) => transaction.type === filter.type
      );
    }

    if (filter.categoryId && filter.categoryId !== "all") {
      filteredTransactions = filteredTransactions.filter(
        (transaction) => transaction.category.id === filter.categoryId
      );
    }

    if (filter.period && filter.period !== "all") {
      const [year, month] = filter.period.split("-");
      filteredTransactions = filteredTransactions.filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        return (
          transactionDate.getFullYear() === parseInt(year) &&
          transactionDate.getMonth() + 1 === parseInt(month)
        );
      });
    }
  }

  setValue(filteredTransactions || []);
}
