import type { CategoryModel } from "@/pages/Category/models";

export interface TransactionModel {
  id?: string;
  description: string;
  amount: number;
  date: string;
  category: CategoryModel;
  type: string;
}
