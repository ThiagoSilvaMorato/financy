import type { CategoryModel } from "@/shared/models/category";
import type { Dispatch, SetStateAction } from "react";

export interface NewCategoryForm {
  id?: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface NewCategoryModalProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  fetchData: () => Promise<void>;
  isEdit?: boolean;
  setIsEdit: Dispatch<SetStateAction<boolean>>;
  categoryInfo?: NewCategoryForm;
  setCategoryInfo: Dispatch<SetStateAction<CategoryModel | null>>;
}
