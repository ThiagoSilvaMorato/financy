import { apolloClient } from "@/lib/graphql/apollo";
import { DELETE_CATEGORY } from "@/lib/graphql/mutation/DeleteCategory";
import type { NewCategoryForm } from "../components/NewCategoryModal/models";
import { CREATE_CATEGORY } from "@/lib/graphql/mutation/CreateCategory";
import { UPDATE_CATEGORY } from "@/lib/graphql/mutation/UpdateCategory";

interface DeleteCategoryMutationData {
  deleteCategory: {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
  };
}

interface CreateCategoryMutationData {
  createCategory: NewCategoryForm;
}

interface UpdateCategoryMutationData {
  updateCategory: NewCategoryForm;
}

export const categoryService = {
  deleteCategory: async (id: string) => {
    return await apolloClient.mutate<DeleteCategoryMutationData>({
      mutation: DELETE_CATEGORY,
      variables: {
        deleteCategoryId: id,
      },
    });
  },

  createCategory: async (formData: NewCategoryForm) => {
    return await apolloClient.mutate<CreateCategoryMutationData, { data: NewCategoryForm }>({
      mutation: CREATE_CATEGORY,
      variables: {
        data: {
          title: formData.title,
          description: formData.description,
          icon: formData.icon,
          color: formData.color,
        },
      },
    });
  },

  updateCategory: async (formData: NewCategoryForm) => {
    return await apolloClient.mutate<
      UpdateCategoryMutationData,
      { data: NewCategoryForm; updateCategoryId: string }
    >({
      mutation: UPDATE_CATEGORY,
      variables: {
        data: {
          title: formData.title,
          description: formData.description,
          icon: formData.icon,
          color: formData.color,
        },
        updateCategoryId: formData.id!,
      },
    });
  },
};
