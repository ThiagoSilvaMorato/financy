import type { SelectOption } from "@/components/CustomSelect/models";
import type { TransactionFilterModel } from "@/pages/Transactions/models";
import type { Control } from "react-hook-form";

export interface FilterProps {
  categories: SelectOption[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<TransactionFilterModel, any, TransactionFilterModel>;
}
