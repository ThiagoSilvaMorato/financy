import type { TransactionModel } from "@/shared/models/transaction";

export interface GetTransactionQueryData {
  listTransactions: TransactionModel[];
}
