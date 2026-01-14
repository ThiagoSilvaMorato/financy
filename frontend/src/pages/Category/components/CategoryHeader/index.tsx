import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

interface CategoryHeaderProps {
  setIsNewModalOpen: Dispatch<SetStateAction<boolean>>;
}

export const CategoryHeader = ({ setIsNewModalOpen }: CategoryHeaderProps) => {
  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-col'>
        <span className='text-2xl font-semibold'>Categorias</span>
        <span className='font-normal text-gray-500'>Organize suas transações por categorias</span>
      </div>
      <Button type='button' onClick={() => setIsNewModalOpen(true)}>
        <Plus />
        Nova Categoria
      </Button>
    </div>
  );
};
