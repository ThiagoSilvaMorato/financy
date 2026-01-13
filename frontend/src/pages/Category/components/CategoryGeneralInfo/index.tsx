import { Card } from "@/components/ui/card";
import { handleColorMap } from "@/utils/colorMap";
import { getLucideIcon } from "@/utils/getLucideIcon";
import { ArrowUpDown, Tag } from "lucide-react";
import type { CategoryModel } from "../../models";

interface CategoryGeneralInfoProps {
  totalCategories: number;
  totalTransactions: number;
  mostUsedCategory: CategoryModel | null;
}

export const CategoryGeneralInfo = ({
  totalCategories,
  totalTransactions,
  mostUsedCategory,
}: CategoryGeneralInfoProps) => {
  const { textStyle } = handleColorMap(mostUsedCategory?.color || "gray");

  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-4 w-full'>
      <Card className='p-6 gap-4'>
        <div className='flex items-baseline gap-4'>
          <Tag className='h-7 w-7 text-[#374151]' />
          <div className='flex flex-col items-start gap-3'>
            <span className='text-3xl font-bold leading-tight'>{totalCategories}</span>
            <span className='text-xs text-gray-500 font-normal'>TOTAL DE CATEGORIAS</span>
          </div>
        </div>
      </Card>

      <Card className='p-6 gap-4'>
        <div className='flex items-baseline gap-4'>
          <ArrowUpDown className='h-7 w-7 text-[#9333ea]' />
          <div className='flex flex-col items-start gap-3'>
            <span className='text-3xl font-bold leading-tight'>{totalTransactions}</span>
            <span className='text-xs text-gray-500 font-normal'>TOTAL DE TRANSAÇÕES</span>
          </div>
        </div>
      </Card>

      <Card className='p-6 gap-4'>
        <div className='flex items-baseline gap-4'>
          <span style={textStyle}>{getLucideIcon(mostUsedCategory?.icon)}</span>
          <div className='flex flex-col items-start gap-3'>
            <span className='text-3xl font-bold leading-tight'>
              {mostUsedCategory?.title || "Nenhuma"}
            </span>
            <span className='text-xs text-gray-500 font-normal'>CATEGORIA MAIS UTILIZADA</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
