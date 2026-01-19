import Divider from "@/components/Divider";
import { CircleArrowUp, CircleArrowDown } from "lucide-react";
import type { ITransactionProps } from "./models";
import { handleColorMap } from "@/utils/colorMap";
import { getLucideIcon } from "@/utils/getLucideIcon";
import { formatCurrency } from "@/utils/formatCurrency";
import { format } from "date-fns";

export const Transaction = ({ title, date, type, amount, category }: ITransactionProps) => {
  const { bgStyle, textStyle } = handleColorMap(category.color);

  const isIncome = type === "income";
  const sign = isIncome ? "+" : "-";
  const DirectionIcon = isIncome ? CircleArrowUp : CircleArrowDown;

  return (
    <>
      <div className='grid grid-cols-4 min-[1169px]:grid-cols-5 items-center justify-between p-4'>
        <div className='flex items-center gap-4 col-span-2 min-[1169px]:col-span-3'>
          <div className='h-10 w-10 flex items-center justify-center rounded-xl' style={bgStyle}>
            <span style={textStyle}>{getLucideIcon(category.icon || "")}</span>
          </div>
          <div className='flex flex-col'>
            <span>{title}</span>
            <span className='text-gray-400'>{format(date, "dd/MM/yyyy")}</span>
          </div>
        </div>

        <div className='w-auto mx-auto px-4 rounded-full' style={bgStyle}>
          <span className='text-sm' style={textStyle}>
            {category.title}
          </span>
        </div>

        <div className='flex justify-end font-medium items-center'>
          <span>
            {sign} R$ {formatCurrency(amount)}
          </span>
          <DirectionIcon
            size={20}
            className='ml-2'
            style={{ color: isIncome ? "#30a956" : "#dc2627" }}
          />
        </div>
      </div>
      <Divider />
    </>
  );
};
