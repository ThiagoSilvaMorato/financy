import { Page } from "@/components/Page";
import { AccountInfo } from "./components/AccountInfo";
import { RecentTransactions } from "./components/RecentTransactions";
import { Categories } from "./components/Categories";

export const Dashboard = () => {
  return (
    <Page>
      <div className='space-y-6'>
        <div className='flex flex-col items-center justify-between'>
          <AccountInfo />
          <div className='w-full mt-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
            <RecentTransactions />
            <Categories />
          </div>
        </div>
      </div>
    </Page>
  );
};
