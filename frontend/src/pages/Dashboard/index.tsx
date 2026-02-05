import { Page } from "@/components/Page";
import { AccountInfo } from "./components/AccountInfo";
import { RecentTransactions } from "./components/RecentTransactions";
import { Categories } from "./components/Categories";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [isTransactionFormModalOpen, setIsTransactionFormModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      await Promise.all([fetchTransactionData(setTransactions), fetchCategoryData(setCategories)]);
    } catch (e) {
      console.error("fetchData error", e);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categoryOptions = useMemo<SelectOption[]>(
    () => categories.map((c) => ({ label: c.title, value: c.id })),
    [categories]
  );

  const { totalBalance, monthlyIncome, monthlyExpenses } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let total = 0;
    let income = 0;
    let expenses = 0;

    for (const t of transactions) {
      const d = new Date(t.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        if (t.type === "income") income += stringToNumber(t.amount);
        if (t.type === "expense") expenses += stringToNumber(t.amount);
      }
      if (t.type === "income") total += stringToNumber(t.amount);
      if (t.type === "expense") total -= stringToNumber(t.amount);
    }

    return {
      totalBalance: formatCurrency(total),
      monthlyIncome: formatCurrency(income),
      monthlyExpenses: formatCurrency(expenses),
    };
  }, [transactions]);

  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);

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
          <AccountInfo
            totalBalance={totalBalance}
            monthlyIncome={monthlyIncome}
            monthlyExpenses={monthlyExpenses}
          />
          <div className='w-full mt-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
            <RecentTransactions
              transactions={recentTransactions}
              setIsTransactionFormModalOpen={setIsTransactionFormModalOpen}
            />
            <Categories categories={categories} />
          </div>
        </div>
      </div>
    </Page>
  );
};
