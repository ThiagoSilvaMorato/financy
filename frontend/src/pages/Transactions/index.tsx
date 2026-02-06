/* eslint-disable react-hooks/set-state-in-effect */
import { Page } from "@/components/Page";
import { TransactionHeader } from "./components/TransactionHeader";
import { Filter } from "./components/Filter";
import { PaginationTable } from "@/components/PaginationTable";
import { Card, CardContent } from "@/components/ui/card";
import { tableColumns } from "./utils/tableColumns";
import { useEffect, useState } from "react";
import { TransactionFormModal } from "../../components/TransactionFormModal";
import { fetchTransactionData } from "./utils/fetchData/Transactions";
import { fetchCategoryData } from "./utils/fetchData/Categories";
import { ConfirmDeleteTransactionModal } from "./components/ConfirmDeleteTransactionModal";
import { toast } from "sonner";
import { transactionService } from "./services";
import type { TransactionModel } from "@/shared/models/transaction";
import type { CategoryModel } from "@/shared/models/category";
import type { SelectOption } from "@/components/CustomSelect/models";
import { useForm, useWatch } from "react-hook-form";
import type { TransactionFilterModel } from "./models";

export const Transactions = () => {
  const [page, setPage] = useState(1);
  const [tableData, setTableData] = useState<TransactionModel[]>([]);
  // const [initialTransactions, setInitialTransactions] = useState<TransactionModel[]>([]);
  const [categories, setCategories] = useState<CategoryModel[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [isTransactionFormModalOpen, setIsTransactionFormModalOpen] = useState(false);
  const [isTransactionDeleteModalOpen, setIsTransactionDeleteModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionModel | null>(null);

  const { control } = useForm<TransactionFilterModel>({
    defaultValues: {
      description: "",
      type: "all",
      categoryId: "all",
      period: "all",
    },
  });

  const filter = useWatch({ control });

  useEffect(() => {
    fetchTransactionData(setTableData, filter);
  }, [filter]);

  useEffect(() => {
    fetchCategoryData(setCategories);
  }, []);

  useEffect(() => {
    const categoriesOption = categories.map((category) => ({
      label: category.title,
      value: category.id,
    }));

    setCategoryOptions(categoriesOption);
  }, [categories]);

  const handleEditClick = (transaction: TransactionModel) => {
    setSelectedTransaction(transaction);
    setIsTransactionFormModalOpen(true);
    setIsEditMode(true);
  };

  const handleDeleteClick = (transaction: TransactionModel) => {
    setSelectedTransaction(transaction);
    setIsTransactionDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsTransactionDeleteModalOpen(false);
    setSelectedTransaction(null);
  };

  const handleConfirmDeleteModal = async () => {
    try {
      const { data } = await transactionService.deleteTransaction(selectedTransaction?.id || "");

      if (data?.deleteTransaction) {
        toast.success("Transação deletada com sucesso.");
        fetchTransactionData(setTableData, filter);
        handleCloseDeleteModal();
      }
    } catch {
      toast.error("Erro ao deletar transação.");
    }
  };

  return (
    <Page>
      <TransactionFormModal
        isOpen={isTransactionFormModalOpen}
        setIsOpen={setIsTransactionFormModalOpen}
        categories={categoryOptions}
        fetchData={() => fetchTransactionData(setTableData, filter)}
        isEdit={isEditMode}
        setIsEdit={setIsEditMode}
        transactionInfo={selectedTransaction}
        setTransactionInfo={setSelectedTransaction}
      />
      <ConfirmDeleteTransactionModal
        isOpen={isTransactionDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDeleteModal}
        transactionTitle={selectedTransaction ? selectedTransaction.description : ""}
      />
      <div className='space-y-6'>
        <TransactionHeader setOpenTransactionFormModal={setIsTransactionFormModalOpen} />
        <Filter categories={categoryOptions} control={control} />
        <Card>
          <CardContent>
            <div className='pt-4'>
              <PaginationTable
                page={page}
                setPage={setPage}
                tableColumns={tableColumns(handleDeleteClick, handleEditClick)}
                data={tableData}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
};
