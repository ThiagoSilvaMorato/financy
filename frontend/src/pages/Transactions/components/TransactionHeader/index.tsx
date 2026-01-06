import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const TransactionHeader = () => {
  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-col'>
        <span className='text-2xl font-semibold'>Transações</span>
        <span className='font-normal text-gray-500'>
          Gerencie todas as suas transações financeiras
        </span>
      </div>
      <Button onClick={() => console.log("Abrir modal de nova transação")}>
        <Plus />
        Nova Transação
      </Button>
    </div>
  );
};
