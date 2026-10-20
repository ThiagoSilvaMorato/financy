import type { UseFormSetValue } from "react-hook-form";
import type { NewTransactionForm, PaymentMethod } from "../../models";
import { Button } from "@/components/ui/button";
import { Wallet, CreditCard } from "lucide-react";

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  setValue: UseFormSetValue<NewTransactionForm>;
}

export const PaymentMethodSelector = ({ value, setValue }: PaymentMethodSelectorProps) => {
  const commonStyles = "w-full h-12 rounded-lg text-base font-normal";

  return (
    <div className='flex border border-gray-300 rounded-lg gap-4 p-2'>
      <Button
        className={`${commonStyles} ${value === "debit" ? "border border-blue-500" : ""}`}
        type='button'
        variant='outline'
        onClick={() => setValue("paymentMethod", "debit")}
      >
        <Wallet className={`${value === "debit" ? "text-blue-500" : "border-none"}`} />
        Débito
      </Button>
      <Button
        className={`${commonStyles} ${value === "credit" ? "border border-purple-500" : ""}`}
        type='button'
        variant='outline'
        onClick={() => setValue("paymentMethod", "credit")}
      >
        <CreditCard className={`${value === "credit" ? "text-purple-500" : "border-none"}`} />
        Crédito
      </Button>
    </div>
  );
};
