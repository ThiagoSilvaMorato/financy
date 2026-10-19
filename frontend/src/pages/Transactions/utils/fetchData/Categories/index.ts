import { apolloClient } from "@/lib/graphql/apollo";
import { GET_CATEGORY } from "@/lib/graphql/queries/GetCategories";
import { useEnvironmentStore } from "@/stores/environment";
import type { CategoryModel } from "@/shared/models/category";
import type { Dispatch, SetStateAction } from "react";

interface GetCategoryQueryData {
  listCategories: CategoryModel[];
}

export async function fetchCategoryData(setValue: Dispatch<SetStateAction<CategoryModel[]>>) {
  const environmentId = useEnvironmentStore.getState().currentEnvironmentId;
  if (!environmentId) return;

  const { data } = await apolloClient.query<GetCategoryQueryData>({
    query: GET_CATEGORY,
    variables: { environmentId },
    fetchPolicy: "no-cache",
  });

  setValue(data?.listCategories || []);
}
