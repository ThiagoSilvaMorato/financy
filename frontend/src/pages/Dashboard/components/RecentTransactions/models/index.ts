import type { TransactionModel } from "@/shared/models/transaction";
import type { Dispatch, SetStateAction } from "react";

export interface RecentTransactionsProps {
  transactions: TransactionModel[];
  setIsTransactionFormModalOpen: Dispatch<SetStateAction<boolean>>;
}
