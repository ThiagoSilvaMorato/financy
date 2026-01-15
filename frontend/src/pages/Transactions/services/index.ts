import { apolloClient } from "@/lib/graphql/apollo";
import { CREATE_TRANSACTION } from "@/lib/graphql/mutation/CreateTransaction";
import type { NewTransactionForm } from "../components/TransactionFormModal/models";
import { UPDATE_TRANSACTION } from "@/lib/graphql/mutation/UpdateTransaction";

// interface DeleteTransactionMutationData {
//   deleteTransaction: {
//     id: string;
//     title: string;
//     description: string;
//     icon: string;
//     color: string;
//   };
// }

interface CreateTransactionMutationData {
  createTransaction: NewTransactionForm;
}

interface UpdateTransactionMutationData {
  updateTransaction: NewTransactionForm;
}

export const transactionService = {
  // deleteTransaction: async (id: string) => {
  //   return await apolloClient.mutate<DeleteTransactionMutationData>({
  //     mutation: DELETE_TRANSACTION,
  //     variables: {
  //       deleteTransactionId: id,
  //     },
  //   });
  // },

  createTransaction: async (formData: NewTransactionForm) => {
    return await apolloClient.mutate<CreateTransactionMutationData, { data: NewTransactionForm }>({
      mutation: CREATE_TRANSACTION,
      variables: {
        data: {
          type: formData.type,
          description: formData.description,
          date: formData.date,
          amount: formData.amount,
          categoryId: formData.categoryId,
        },
      },
    });
  },

  updateTransaction: async (formData: NewTransactionForm) => {
    return await apolloClient.mutate<
      UpdateTransactionMutationData,
      { data: NewTransactionForm; updateTransactionId: string }
    >({
      mutation: UPDATE_TRANSACTION,
      variables: {
        data: {
          type: formData.type,
          description: formData.description,
          date: formData.date,
          amount: formData.amount,
          categoryId: formData.categoryId,
        },
        updateTransactionId: formData.id!,
      },
    });
  },
};
