import { extendedColorMap } from "@/utils/colorMap";
import type { ICategoryProps } from "./models";
import { formatCurrency } from "@/utils/formatCurrency";

export const Category = ({ name, color, itemsAmount, totalAmount }: ICategoryProps) => {
  const colorObj = extendedColorMap[color] ?? extendedColorMap["green"];
  const hex = colorObj.hex;

  const bgStyle = { backgroundColor: `${hex}33` };
  const textStyle = { color: hex };

  const itemsText = itemsAmount === 1 ? "item" : "itens";

  return (
    <div className='grid grid-cols-5 gap-4 p-4'>
      <div
        style={bgStyle}
        className='w-auto mr-auto px-4 rounded-full col-span-2 flex items-center'
      >
        <span className='text-sm' style={textStyle}>
          {name}
        </span>
      </div>
      <div className='flex items-center'>
        <span className='text-gray-500 text-xs items-center'>
          {itemsAmount} {itemsText}
        </span>
      </div>
      <span className='col-span-2'>R$ {formatCurrency(totalAmount)}</span>
    </div>
  );
};
