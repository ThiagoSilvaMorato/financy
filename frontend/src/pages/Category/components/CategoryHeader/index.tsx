import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const CategoryHeader = () => {
  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-col'>
        <span className='text-2xl font-semibold'>Categorias</span>
        <span className='font-normal text-gray-500'>Organize suas transações por categorias</span>
      </div>
      <Button onClick={() => console.log("Abrir modal de nova categoria")}>
        <Plus />
        Nova Categoria
      </Button>
    </div>
  );
};
