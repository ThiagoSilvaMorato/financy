import type { CategoryModel } from "./category";

export interface TransactionModel {
  id?: string;
  description: string;
  amount: string;
  date: string;
  category: CategoryModel;
  type: "income" | "expense";
}
