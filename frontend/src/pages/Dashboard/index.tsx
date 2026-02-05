/* eslint-disable react-hooks/exhaustive-deps */
import { Page } from "@/components/Page";
import { AccountInfo } from "./components/AccountInfo";
import { RecentTransactions } from "./components/RecentTransactions";
import { Categories } from "./components/Categories";
import { useCallback, useEffect, useState } from "react";
import { fetchTransactionData } from "../Transactions/utils/fetchData/Transactions";
import type { TransactionModel } from "@/shared/models/transaction";
import type { CategoryModel } from "@/shared/models/category";
import { fetchCategoryData } from "../Transactions/utils/fetchData/Categories";
import { formatCurrency } from "@/utils/formatCurrency";
import { TransactionFormModal } from "@/components/TransactionFormModal";
import type { SelectOption } from "@/components/CustomSelect/models";
import { stringToNumber } from "@/utils/stringToNumber";

export const Dashboard = () => {
  const [transactions, setTransactions] = useState<TransactionModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  const [monthlyExpenses, setMonthlyExpenses] = useState<string>("");
  const [isTransactionFormModalOpen, setIsTransactionFormModalOpen] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);

  const fetchData = useCallback(async () => {
    fetchTransactionData(setTransactions);
    fetchCategoryData(setCategories);
  }, []);

  useEffect(() => {
    const categoriesOption = categories.map((category) => ({
      label: category.title,
      value: category.id,
    }));

    console.log(categoriesOption);

    setCategoryOptions(categoriesOption);
  }, [categories]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let income = 0;
    let expenses = 0;

    for (const t of transactions) {
      const d = new Date(t.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        if (t.type === "income") income += stringToNumber(t.amount);
        if (t.type === "expense") expenses += stringToNumber(t.amount);

        console.log({ teste: t.amount });
      }
    }

    setMonthlyIncome(formatCurrency(income));
    setMonthlyExpenses(formatCurrency(expenses));
  }, [transactions]);

  return (
    <Page>
      <TransactionFormModal
        isOpen={isTransactionFormModalOpen}
        setIsOpen={setIsTransactionFormModalOpen}
        categories={categoryOptions}
        fetchData={fetchData}
      />
      <div className='space-y-6'>
        <div className='flex flex-col items-center justify-between'>
          <AccountInfo monthlyIncome={monthlyIncome} monthlyExpenses={monthlyExpenses} />
          <div className='w-full mt-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
            <RecentTransactions
              transactions={transactions}
              setIsTransactionFormModalOpen={setIsTransactionFormModalOpen}
            />
            <Categories categories={categories} />
          </div>
        </div>
      </div>
    </Page>
  );
};
