import type { CategoryModel } from "./category";

export interface TransactionModel {
  id?: string;
  description: string;
  amount: number;
  date: string;
  category: CategoryModel;
  type: "income" | "expense";
}
