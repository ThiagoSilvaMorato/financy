import Divider from "@/components/Divider";
import { Card } from "@/components/ui/card";
import { ChevronRight, Plus } from "lucide-react";
import { Transaction } from "./Transaction";
import { useNavigate } from "react-router";
import type { RecentTransactionsProps } from "./models";
import { useEffect, useState } from "react";
import type { TransactionModel } from "@/shared/models/transaction";

export const RecentTransactions = ({
  transactions,
  setIsTransactionFormModalOpen,
}: RecentTransactionsProps) => {
  const navigate = useNavigate();
  const [recentTransactions, setRecentTransactions] = useState<TransactionModel[]>([]);

  useEffect(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const transactionList: TransactionModel[] = [];

    for (const t of transactions) {
      const d = new Date(t.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        transactionList.push(t);
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentTransactions(transactionList);
  }, [transactions]);

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
      {recentTransactions.map((transaction) => (
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
          onClick={() => setIsTransactionFormModalOpen(true)}
        >
          <Plus size={20} /> Nova transação
        </span>
      </div>
    </Card>
  );
};
