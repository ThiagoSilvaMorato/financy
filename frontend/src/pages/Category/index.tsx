import { Page } from "@/components/Page";
import { CategoryHeader } from "./components/CategoryHeader";
import { CategoryGeneralInfo } from "./components/CategoryGeneralInfo";
import { CategoryList } from "./components/CategoryList";
import { apolloClient } from "@/lib/graphql/apollo";
import { useEffect, useState } from "react";
import { GET_CATEGORY } from "@/lib/graphql/queries/GetCategories";
import { NewCategoryModal } from "./components/NewCategoryModal";
import { useEnvironmentStore } from "@/stores/environment";
import type { CategoryModel } from "@/shared/models/category";

interface GetCategoryQueryData {
  listCategories: CategoryModel[];
}

export const Categories = () => {
  const currentEnvironmentId = useEnvironmentStore((state) => state.currentEnvironmentId);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [mostUsedCategory, setMostUsedCategory] = useState<CategoryModel | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [categoryToBeEdited, setCategoryToBeEdited] = useState<CategoryModel | null>(null);

  const fetchData = async () => {
    if (!currentEnvironmentId) return;

    const { data } = await apolloClient.query<GetCategoryQueryData>({
      query: GET_CATEGORY,
      variables: { environmentId: currentEnvironmentId },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEnvironmentId]);

  return (
    <Page>
      <NewCategoryModal
        isOpen={isNewModalOpen}
        setIsOpen={setIsNewModalOpen}
        fetchData={fetchData}
        isEdit={isEditMode}
        setIsEdit={setIsEditMode}
        categoryInfo={categoryToBeEdited || undefined}
        setCategoryInfo={setCategoryToBeEdited}
      />
      <div className='flex flex-col gap-8'>
        <CategoryHeader setIsNewModalOpen={setIsNewModalOpen} />
        <CategoryGeneralInfo
          totalCategories={categories.length}
          totalTransactions={totalTransactions}
          mostUsedCategory={mostUsedCategory}
        />
        <CategoryList
          categories={categories}
          fetchData={fetchData}
          setCategoryToBeEdited={setCategoryToBeEdited}
          setIsEditMode={setIsEditMode}
          setIsNewCategoryModalOpen={setIsNewModalOpen}
        />
      </div>
    </Page>
  );
};
