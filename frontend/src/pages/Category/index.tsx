import { Page } from "@/components/Page";
import { CategoryHeader } from "./components/CategoryHeader";
import { CategoryGeneralInfo } from "./components/CategoryGeneralInfo";
import { CategoryList } from "./components/CategoryList";
import { apolloClient } from "@/lib/graphql/apollo";
import { useEffect, useState } from "react";
import type { CategoryModel } from "./models";
import { GET_CATEGORY } from "@/lib/graphql/queries/GetCategories";

interface GetCategoryQueryData {
  listCategories: CategoryModel[];
}

export const Categories = () => {
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [mostUsedCategory, setMostUsedCategory] = useState<CategoryModel | null>(null);

  const fetchData = async () => {
    const { data } = await apolloClient.query<GetCategoryQueryData>({
      query: GET_CATEGORY,
      fetchPolicy: "no-cache",
    });

    const categoriesData = data?.listCategories || [];

    const total = categoriesData.reduce(
      (sum, category) => sum + (category.transactionsCount || 0),
      0
    );

    const most = categoriesData.reduce<CategoryModel | null>((prev, curr) => {
      if (!prev) return curr;
      return curr.transactionsCount > prev.transactionsCount ? curr : prev;
    }, null);

    setTotalTransactions(total);
    setMostUsedCategory(most);
    setCategories(categoriesData);
  };

  useEffect(() => {
    (async () => {
      await fetchData();
    })();
  }, []);

  return (
    <Page>
      <div className='flex flex-col gap-8'>
        <CategoryHeader onCategoryCreated={fetchData} />
        <CategoryGeneralInfo
          totalCategories={categories.length}
          totalTransactions={totalTransactions}
          mostUsedCategory={mostUsedCategory}
        />
        <CategoryList categories={categories} />
      </div>
    </Page>
  );
};
