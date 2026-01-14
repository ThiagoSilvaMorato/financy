import { CategoryCard } from "./components/CategoryCard";
import type { CategoryModel } from "../../models";
import type { Dispatch, SetStateAction } from "react";

interface CategoryListProps {
  categories: CategoryModel[];
  fetchData: () => Promise<void>;
  setIsEditMode: Dispatch<SetStateAction<boolean>>;
  setCategoryToBeEdited: Dispatch<SetStateAction<CategoryModel | null>>;
  setIsNewCategoryModalOpen: Dispatch<SetStateAction<boolean>>;
}

export const CategoryList = ({
  categories,
  fetchData,
  setIsEditMode,
  setCategoryToBeEdited,
  setIsNewCategoryModalOpen,
}: CategoryListProps) => {
  return (
    <div className='grid grid-cols-4 gap-4'>
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          id={category.id}
          title={category.title}
          description={category.description}
          icon={category.icon}
          color={category.color}
          transactionCount={category.transactionsCount}
          fetchData={fetchData}
          setIsEditMode={setIsEditMode}
          setCategoryToBeEdited={setCategoryToBeEdited}
          setIsNewCategoryModalOpen={setIsNewCategoryModalOpen}
        />
      ))}
    </div>
  );
};
