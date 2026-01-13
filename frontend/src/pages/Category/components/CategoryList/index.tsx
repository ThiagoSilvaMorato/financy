import { CategoryCard } from "./components/CategoryCard";
import type { CategoryModel } from "../../models";

interface CategoryListProps {
  categories: CategoryModel[];
}

export const CategoryList = ({ categories }: CategoryListProps) => {
  return (
    <div className='grid grid-cols-4 gap-4'>
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          title={category.title}
          description={category.description}
          icon={category.icon}
          color={category.color}
          transactionCount={category.transactionsCount}
        />
      ))}
    </div>
  );
};
