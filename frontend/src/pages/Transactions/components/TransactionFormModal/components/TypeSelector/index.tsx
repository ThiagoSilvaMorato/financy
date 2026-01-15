import type { UseFormSetValue } from "react-hook-form";
import type { NewTransactionForm } from "../../models";
import { Button } from "@/components/ui/button";
import { CircleArrowDown, CircleArrowUp } from "lucide-react";

interface TypeSelectorProps {
  value: "income" | "expense";
  setValue: UseFormSetValue<NewTransactionForm>;
}

export const TypeSelector = ({ value, setValue }: TypeSelectorProps) => {
  const commonStyles = "w-full h-12 rounded-lg text-base font-normal";

  return (
    <div className='flex border border-gray-300 rounded-lg gap-4 p-2'>
      <Button
        className={`${commonStyles} ${value === "expense" ? "border border-red-500" : ""}`}
        type='button'
        variant='outline'
        onClick={() => setValue("type", "expense")}
      >
        <CircleArrowDown className={`${value === "expense" ? "text-red-500" : "border-none"}`} />
        Despesa
      </Button>
      <Button
        className={`${commonStyles} ${value === "income" ? "border border-green-500" : ""}`}
        type='button'
        variant='outline'
        onClick={() => setValue("type", "income")}
      >
        <CircleArrowUp className={`${value === "income" ? "text-green-500" : "border-none"}`} />
        Receita
      </Button>
    </div>
  );
};
