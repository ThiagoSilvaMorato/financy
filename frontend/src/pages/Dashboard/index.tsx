import { Page } from "@/components/Page";
import { AccountInfo } from "./components/AccountInfo";
import { RecentTransactions } from "./components/RecentTransactions";
import { Categories } from "./components/Categories";
import { useEffect, useState } from "react";
import { fetchTransactionData } from "../Transactions/utils/fetchData/Transactions";
import type { TransactionModel } from "@/shared/models/transaction";
import type { CategoryModel } from "@/shared/models/category";
import { fetchCategoryData } from "../Transactions/utils/fetchData/Categories";

export const Dashboard = () => {
  const [transactions, setTransactions] = useState<TransactionModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);

  useEffect(() => {
    fetchTransactionData(setTransactions);
    fetchCategoryData(setCategories);
  }, []);

  return (
    <Page>
      <div className='space-y-6'>
        <div className='flex flex-col items-center justify-between'>
          <AccountInfo />
          <div className='w-full mt-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
            <RecentTransactions transactions={transactions} />
            <Categories categories={categories} />
          </div>
        </div>
      </div>
    </Page>
  );
};
