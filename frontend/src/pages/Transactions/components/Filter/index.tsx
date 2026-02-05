import { CustomInput } from "@/components/CustomInput";
import { CustomSelect } from "@/components/CustomSelect";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import { Controller } from "react-hook-form";
import { generatePeriodOptions } from "../../utils/generatePeriodOptions";
import type { FilterProps } from "./models";

export const Filter = ({ categories, control }: FilterProps) => {
  const typeOptions = [
    { label: "Todos", value: "all" },
    { label: "Entrada", value: "income" },
    { label: "Saída", value: "expense" },
  ];
  const categoryOptions = [
    { label: "Todas", value: "all" },
    ...(Array.isArray(categories) ? categories : []),
  ];
  const periodOptions = generatePeriodOptions(12);

  return (
    <Card>
      <CardContent>
        <div className='grid grid-cols-4 pt-4 gap-3'>
          <Controller
            control={control}
            name='description'
            render={({ field }) => (
              <CustomInput
                label='Buscar'
                id='search'
                placeholder='Buscar por descrição'
                className='col-span-4 md:col-span-2 lg:col-span-1 mr-4'
                icon={<Search />}
                value={field.value}
                setValue={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name='type'
            render={({ field }) => (
              <CustomSelect
                label='Tipo'
                placeholder='Todos'
                options={typeOptions}
                defaultValue='all'
                value={field.value}
                onSelect={field.onChange as (value: string) => void}
              />
            )}
          />
          <Controller
            control={control}
            name='categoryId'
            render={({ field }) => (
              <CustomSelect
                label='Categoria'
                placeholder='Todas'
                options={categoryOptions}
                defaultValue='all'
                value={field.value}
                onSelect={field.onChange as (value: string) => void}
              />
            )}
          />
          <Controller
            control={control}
            name='period'
            render={({ field }) => (
              <CustomSelect
                label='Período'
                placeholder='Todos'
                options={periodOptions}
                defaultValue='all'
                value={field.value}
                onSelect={field.onChange as (value: string) => void}
              />
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
