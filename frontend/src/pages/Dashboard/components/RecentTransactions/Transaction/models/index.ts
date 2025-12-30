export interface ITransactionProps {
  title: string;
  date: string;
  type: "income" | "expense";
  amount: number;
  icon?: string;
  color: string;
  category: string;
}
