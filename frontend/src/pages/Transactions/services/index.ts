import { apolloClient } from "@/lib/graphql/apollo";
import { CREATE_TRANSACTION } from "@/lib/graphql/mutation/CreateTransaction";
import type { NewTransactionForm } from "../../../components/TransactionFormModal/models";
import { UPDATE_TRANSACTION } from "@/lib/graphql/mutation/UpdateTransaction";
import { DELETE_TRANSACTION } from "@/lib/graphql/mutation/DeleteTransaction";
import { useEnvironmentStore } from "@/stores/environment";

interface DeleteTransactionMutationData {
  deleteTransaction: {
    id: string;
    type: string;
    description: string;
    date: string;
    amount: number;
    category: {
      id: string;
      title: string;
      description: string;
    };
  };
}

interface CreateTransactionMutationData {
  createTransaction: NewTransactionForm;
}

interface UpdateTransactionMutationData {
  updateTransaction: NewTransactionForm;
}

interface TransactionInputVariables {
  data: {
    type: "income" | "expense";
    description?: string;
    date: Date | undefined;
    amount: string;
    categoryId: string;
    memberId: string;
    environmentId: string;
  };
}

function buildTransactionInput(formData: NewTransactionForm): TransactionInputVariables["data"] {
  const environmentId = useEnvironmentStore.getState().currentEnvironmentId;

  if (!environmentId) {
    throw new Error("Nenhum ambiente ativo selecionado.");
  }

  return {
    type: formData.type,
    description: formData.description,
    date: formData.date,
    amount: formData.amount,
    categoryId: formData.categoryId,
    memberId: formData.memberId,
    environmentId,
  };
}

export const transactionService = {
  deleteTransaction: async (id: string) => {
    return await apolloClient.mutate<DeleteTransactionMutationData>({
      mutation: DELETE_TRANSACTION,
      variables: {
        deleteTransactionId: id,
      },
    });
  },

  createTransaction: async (formData: NewTransactionForm) => {
    return await apolloClient.mutate<
      CreateTransactionMutationData,
      TransactionInputVariables
    >({
      mutation: CREATE_TRANSACTION,
      variables: {
        data: buildTransactionInput(formData),
      },
    });
  },

  updateTransaction: async (formData: NewTransactionForm) => {
    return await apolloClient.mutate<
      UpdateTransactionMutationData,
      TransactionInputVariables & { updateTransactionId: string }
    >({
      mutation: UPDATE_TRANSACTION,
      variables: {
        data: buildTransactionInput(formData),
        updateTransactionId: formData.id!,
      },
    });
  },
};
