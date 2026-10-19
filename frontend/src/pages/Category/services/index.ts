import { apolloClient } from "@/lib/graphql/apollo";
import { DELETE_CATEGORY } from "@/lib/graphql/mutation/DeleteCategory";
import type { NewCategoryForm } from "../components/NewCategoryModal/models";
import { CREATE_CATEGORY } from "@/lib/graphql/mutation/CreateCategory";
import { UPDATE_CATEGORY } from "@/lib/graphql/mutation/UpdateCategory";
import { useEnvironmentStore } from "@/stores/environment";

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

interface CategoryInputVariables {
  data: {
    title: string;
    description: string;
    icon: string;
    color: string;
    environmentId: string;
  };
}

function buildCategoryInput(formData: NewCategoryForm): CategoryInputVariables["data"] {
  const environmentId = useEnvironmentStore.getState().currentEnvironmentId;

  if (!environmentId) {
    throw new Error("Nenhum ambiente ativo selecionado.");
  }

  return {
    title: formData.title,
    description: formData.description,
    icon: formData.icon,
    color: formData.color,
    environmentId,
  };
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
    return await apolloClient.mutate<CreateCategoryMutationData, CategoryInputVariables>({
      mutation: CREATE_CATEGORY,
      variables: {
        data: buildCategoryInput(formData),
      },
    });
  },

  updateCategory: async (formData: NewCategoryForm) => {
    return await apolloClient.mutate<
      UpdateCategoryMutationData,
      CategoryInputVariables & { updateCategoryId: string }
    >({
      mutation: UPDATE_CATEGORY,
      variables: {
        data: buildCategoryInput(formData),
        updateCategoryId: formData.id!,
      },
    });
  },
};
