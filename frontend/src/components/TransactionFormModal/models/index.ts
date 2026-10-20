import type { SelectOption } from "@/components/CustomSelect/models";
import type { TransactionModel } from "@/shared/models/transaction";
import type { Dispatch, SetStateAction } from "react";

export type PaymentMethod = "debit" | "credit";

export interface NewTransactionForm {
  id?: string;
  type: "income" | "expense";
  description?: string;
  date: Date | undefined;
  amount: string;
  categoryId: string;
  memberId: string;
  paymentMethod?: PaymentMethod;
  amountIsTotal?: boolean;
  installmentsCount?: number;
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
