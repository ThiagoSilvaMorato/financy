export interface TransactionFilterModel {
  description?: string;
  type?: "income" | "expense" | "all";
  categoryId?: string;
  period?: string;
}
