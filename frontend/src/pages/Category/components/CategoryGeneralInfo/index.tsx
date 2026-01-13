import { Card } from "@/components/ui/card";
import { ArrowUpDown, CircleArrowDown, Tag } from "lucide-react";

export const CategoryGeneralInfo = () => {
  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-4 w-full'>
      <Card className='p-6 gap-4'>
        <div className='flex items-baseline gap-4'>
          <Tag className='h-7 w-7 text-[#374151]' />
          <div className='flex flex-col items-start gap-3'>
            <span className='text-3xl font-bold leading-tight'>8</span>
            <span className='text-xs text-gray-500 font-normal'>TOTAL DE CATEGORIAS</span>
          </div>
        </div>
      </Card>

      <Card className='p-6 gap-4'>
        <div className='flex items-baseline gap-4'>
          <ArrowUpDown className='h-7 w-7 text-[#9333ea]' />
          <div className='flex flex-col items-start gap-3'>
            <span className='text-3xl font-bold leading-tight'>27</span>
            <span className='text-xs text-gray-500 font-normal'>TOTAL DE TRANSAÇÕES</span>
          </div>
        </div>
      </Card>

      <Card className='p-6 gap-4'>
        <div className='flex items-baseline gap-4'>
          {/*TODO: Cor e ícone aqui vai ser de acordo com a categoria mais utilizada*/}
          <CircleArrowDown className='h-7 w-7 text-[#dc2627]' />
          <div className='flex flex-col items-start gap-3'>
            <span className='text-3xl font-bold leading-tight'>Alimentação</span>
            <span className='text-xs text-gray-500 font-normal'>CATEGORIA MAIS UTILIZADA</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
