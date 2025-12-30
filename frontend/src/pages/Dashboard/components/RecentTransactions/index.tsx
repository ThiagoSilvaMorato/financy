import Divider from "@/components/Divider";
import { Card } from "@/components/ui/card";
import { ChevronRight, Plus } from "lucide-react";
import { Transaction } from "./Transaction";

export const RecentTransactions = () => {
  const mockedTransactions = [
    {
      id: 1,
      title: "Pagamento Salário",
      date: "01/12/25",
      type: "income",
      amount: 4250.0,
      icon: "Wallet",
      color: "green",
      category: "Receita",
    },
    {
      id: 2,
      title: "Compra Supermercado",
      date: "03/12/25",
      type: "expense",
      amount: 180.45,
      icon: "Utensils",
      color: "blue",
      category: "Alimentação",
    },
    {
      id: 3,
      title: "Posto de Gasolina",
      date: "05/12/25",
      type: "income",
      amount: 300.0,
      icon: "PiggyBank",
      color: "purple",
      category: "Transporte",
    },
  ];

  return (
    <Card className='col-span-2'>
      <div className='h-12 flex items-center justify-between p-4'>
        <span className='text-gray-400 text-xs'>TRANSAÇÕES RECENTES</span>
        <span
          className='text-[#357d56] hover:underline cursor-pointer flex items-center'
          onClick={() => console.log("Direcionando para todas as transações...")}
        >
          Ver todas <ChevronRight size={20} />{" "}
        </span>
      </div>
      <Divider />
      {mockedTransactions.map((transaction) => (
        <Transaction
          key={transaction.id}
          title={transaction.title}
          date={transaction.date}
          type={transaction.type as "income" | "expense"}
          amount={transaction.amount}
          icon={transaction.icon}
          color={transaction.color}
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
