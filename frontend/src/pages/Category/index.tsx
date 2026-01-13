import { Page } from "@/components/Page";
import { CategoryHeader } from "./components/CategoryHeader";
import { CategoryGeneralInfo } from "./components/CategoryGeneralInfo";
import { CategoryList } from "./components/CategoryList";

export const Categories = () => {
  return (
    <Page>
      <div className='flex flex-col gap-8'>
        <CategoryHeader />
        <CategoryGeneralInfo />
        <CategoryList />
      </div>
    </Page>
  );
};
