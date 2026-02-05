import type { CategoryModel } from "@/shared/models/category";

export interface ITransactionProps {
  title: string;
  date: string;
  type: "income" | "expense";
  amount: string;
  category: CategoryModel;
}
