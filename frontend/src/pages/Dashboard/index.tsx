/* eslint-disable react-hooks/set-state-in-effect */
import { Page } from "@/components/Page";
import { AccountInfo } from "./components/AccountInfo";
import { RecentTransactions } from "./components/RecentTransactions";
import { Categories } from "./components/Categories";
import { useEffect, useState } from "react";
import { fetchTransactionData } from "../Transactions/utils/fetchData/Transactions";
import type { TransactionModel } from "@/shared/models/transaction";
import type { CategoryModel } from "@/shared/models/category";
import { fetchCategoryData } from "../Transactions/utils/fetchData/Categories";
import { formatCurrency } from "@/utils/formatCurrency";
import { parseAmount } from "@/utils/parseAmount";

export const Dashboard = () => {
  const [transactions, setTransactions] = useState<TransactionModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [totalBalance, setTotalBalance] = useState<string>("");
  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  const [monthlyExpenses, setMonthlyExpenses] = useState<string>("");

  useEffect(() => {
    fetchTransactionData(setTransactions);
    fetchCategoryData(setCategories);
  }, []);

  useEffect(() => {
    console.log("Categories updated:", categories);
  }, [categories]);

  useEffect(() => {
    const total = categories.reduce((acc, c) => acc + parseAmount(c.totalAmount), 0);
    setTotalBalance(formatCurrency(total));
  }, [categories]);

  useEffect(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let income = 0;
    let expenses = 0;

    for (const t of transactions) {
      const d = new Date(t.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        if (t.type === "income") income += t.amount;
        if (t.type === "expense") expenses += t.amount;
      }
    }

    setMonthlyIncome(formatCurrency(income));
    setMonthlyExpenses(formatCurrency(expenses));
  }, [transactions]);

  return (
    <Page>
      <div className='space-y-6'>
        <div className='flex flex-col items-center justify-between'>
          <AccountInfo
            totalBalance={totalBalance}
            monthlyIncome={monthlyIncome}
            monthlyExpenses={monthlyExpenses}
          />
          <div className='w-full mt-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
            <RecentTransactions transactions={transactions} />
            <Categories categories={categories} />
          </div>
        </div>
      </div>
    </Page>
  );
};
