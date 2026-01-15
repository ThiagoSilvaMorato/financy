import { Page } from "@/components/Page";
import { TransactionHeader } from "./components/TransactionHeader";
import { Filter } from "./components/Filter";
import { PaginationTable } from "@/components/PaginationTable";
import { Card, CardContent } from "@/components/ui/card";
import { tableColumns } from "./utils/tableColumns";
import { useEffect, useState } from "react";
import type { TransactionModel } from "./models";
import { TransactionFormModal } from "./components/TransactionFormModal";
import type { SelectOption } from "@/components/CustomSelect/models";
import { fetchTransactionData } from "./utils/fetchData/Transactions";
import { fetchCategoryData } from "./utils/fetchData/Categories";

export const Transactions = () => {
  const [page, setPage] = useState(1);
  const [tableData, setTableData] = useState<TransactionModel[]>([]);
  const [categories, setCategories] = useState<SelectOption[]>([]);
  const [isTransactionFormModalOpen, setIsTransactionFormModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [transactionToBeEdited, setTransactionToBeEdited] = useState<TransactionModel | null>(null);

  useEffect(() => {
    fetchTransactionData(setTableData);
    fetchCategoryData(setCategories);
  }, []);

  const handleEditClick = (transaction: TransactionModel) => {
    setTransactionToBeEdited(transaction);
    setIsTransactionFormModalOpen(true);
    setIsEditMode(true);
  };

  return (
    <Page>
      <TransactionFormModal
        isOpen={isTransactionFormModalOpen}
        setIsOpen={setIsTransactionFormModalOpen}
        categories={categories}
        fetchData={() => fetchTransactionData(setTableData)}
        isEdit={isEditMode}
        setIsEdit={setIsEditMode}
        transactionInfo={transactionToBeEdited}
        setTransactionInfo={setTransactionToBeEdited}
      />
      <div className='space-y-6'>
        <TransactionHeader setOpenTransactionFormModal={setIsTransactionFormModalOpen} />
        <Filter categories={categories} />
        <Card>
          <CardContent>
            <div className='pt-4'>
              <PaginationTable
                page={page}
                setPage={setPage}
                tableColumns={tableColumns(handleEditClick)}
                data={tableData}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
};
