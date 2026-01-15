import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

interface TransactionHeaderProps {
  setOpenTransactionFormModal: Dispatch<SetStateAction<boolean>>;
}

export const TransactionHeader = ({ setOpenTransactionFormModal }: TransactionHeaderProps) => {
  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-col'>
        <span className='text-2xl font-semibold'>Transações</span>
        <span className='font-normal text-gray-500'>
          Gerencie todas as suas transações financeiras
        </span>
      </div>
      <Button onClick={() => setOpenTransactionFormModal(true)}>
        <Plus />
        Nova Transação
      </Button>
    </div>
  );
};
