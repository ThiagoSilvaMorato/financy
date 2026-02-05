import type { SelectOption } from "@/components/CustomSelect/models";
import type { TransactionModel } from "@/shared/models/transaction";
import type { Dispatch, SetStateAction } from "react";

export interface NewTransactionForm {
  id?: string;
  type: "income" | "expense";
  description?: string;
  date: Date | undefined;
  amount: string;
  categoryId: string;
}

export interface TransactionFormModalProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  categories: SelectOption[];
  isEdit?: boolean;
  setIsEdit?: Dispatch<SetStateAction<boolean>>;
  transactionInfo?: TransactionModel | null;
  setTransactionInfo?: Dispatch<SetStateAction<TransactionModel | null>>;
  fetchData: () => Promise<void>;
}
