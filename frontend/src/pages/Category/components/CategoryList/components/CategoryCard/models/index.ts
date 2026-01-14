import type { CategoryModel } from "@/pages/Category/models";
import type { Dispatch, SetStateAction } from "react";

export interface CategoryCardProps {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  transactionCount: number;
  fetchData: () => Promise<void>;
  setIsEditMode: Dispatch<SetStateAction<boolean>>;
  setCategoryToBeEdited: Dispatch<SetStateAction<CategoryModel | null>>;
  setIsNewCategoryModalOpen: Dispatch<SetStateAction<boolean>>;
}
