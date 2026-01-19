import Divider from "@/components/Divider";
import { Card } from "@/components/ui/card";
import { ChevronRight, Plus } from "lucide-react";
import { Transaction } from "./Transaction";
import { useNavigate } from "react-router";
import type { RecentTransactionsProps } from "./models";

export const RecentTransactions = ({ transactions }: RecentTransactionsProps) => {
  const navigate = useNavigate();

  return (
    <Card className='col-span-2'>
      <div className='h-12 flex items-center justify-between p-4'>
        <span className='text-gray-500 text-xs'>TRANSAÇÕES RECENTES</span>
        <span
          className='text-[#357d56] hover:underline cursor-pointer flex items-center'
          onClick={() => navigate("/transactions")}
        >
          Ver todas <ChevronRight size={20} />{" "}
        </span>
      </div>
      <Divider />
      {transactions.map((transaction) => (
        <Transaction
          key={transaction.id}
          title={transaction.description}
          date={transaction.date}
          type={transaction.type as "income" | "expense"}
          amount={transaction.amount}
          category={transaction.category}
        />
      ))}
      <div className='h-12 flex items-center justify-center p-4'>
        <span
          className='text-[#357d56] hover:underline cursor-pointer flex items-center'
          onClick={() => console.log("Abrindo modal para nova transação...")}
        >
          <Plus size={20} /> Nova transação
        </span>
      </div>
    </Card>
  );
};
