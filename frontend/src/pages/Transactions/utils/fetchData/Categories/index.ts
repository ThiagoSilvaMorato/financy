import { apolloClient } from "@/lib/graphql/apollo";
import { GET_CATEGORY } from "@/lib/graphql/queries/GetCategories";
import type { CategoryModel } from "@/shared/models/category";
import type { Dispatch, SetStateAction } from "react";

interface GetCategoryQueryData {
  listCategories: CategoryModel[];
}

export async function fetchCategoryData(setValue: Dispatch<SetStateAction<CategoryModel[]>>) {
  const { data } = await apolloClient.query<GetCategoryQueryData>({
    query: GET_CATEGORY,
    fetchPolicy: "no-cache",
  });

  setValue(data?.listCategories || []);
}
