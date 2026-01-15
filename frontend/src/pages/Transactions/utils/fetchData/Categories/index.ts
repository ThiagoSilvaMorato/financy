import type { SelectOption } from "@/components/CustomSelect/models";
import { apolloClient } from "@/lib/graphql/apollo";
import { GET_CATEGORY } from "@/lib/graphql/queries/GetCategories";
import type { CategoryModel } from "@/pages/Category/models";
import type { Dispatch, SetStateAction } from "react";

interface GetCategoryQueryData {
  listCategories: CategoryModel[];
}

export async function fetchCategoryData(setValue: Dispatch<SetStateAction<SelectOption[]>>) {
  const { data } = await apolloClient.query<GetCategoryQueryData>({
    query: GET_CATEGORY,
    fetchPolicy: "no-cache",
  });

  setValue(
    data?.listCategories.map((category) => ({
      label: category.title,
      value: category.id,
    })) || []
  );
}
