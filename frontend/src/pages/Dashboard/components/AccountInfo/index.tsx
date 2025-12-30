import { Card } from "@/components/ui/card";
import { CircleArrowDown, CircleArrowUp, Wallet } from "lucide-react";

export const AccountInfo = () => {
  return (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-4 w-full'>
      <Card className='p-6 gap-4'>
        <div className='flex items-center gap-4 mb-4'>
          <Wallet className='h-6 w-6 text-[#9333ea]' />
          <span className='text-gray-400 text-xs'>SALDO TOTAL</span>
        </div>
        <span className='text-3xl font-bold'>R$12.847,32</span>
      </Card>
      <Card className='p-6 gap-4'>
        <div className='flex items-center gap-4 mb-4'>
          <CircleArrowUp className='h-6 w-6 text-[#2f794f]' />
          <span className='text-gray-400 text-xs'>RECEITAS DO MÊS</span>
        </div>
        <span className='text-3xl font-bold'>R$4.250,00</span>
      </Card>
      <Card className='p-6 gap-4'>
        <div className='flex items-center gap-4 mb-4'>
          <CircleArrowDown className='h-6 w-6 text-[#dc2627]' />
          <span className='text-gray-400 text-xs'>DESPESAS DO MÊS</span>
        </div>
        <span className='text-3xl font-bold'>R$2.180,45</span>
      </Card>
    </div>
  );
};
