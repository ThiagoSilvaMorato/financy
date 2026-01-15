import { CustomInput } from "@/components/CustomInput";
import { CustomSelect } from "@/components/CustomSelect";
import type { SelectOption } from "@/components/CustomSelect/models";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import { useState } from "react";

interface FilterProps {
  categories: SelectOption[];
}

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function generatePeriodOptions(months = 12) {
  const options: SelectOption[] = [{ label: "Todos", value: "all" }];
  const now = new Date();

  for (let i = 1; i <= months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${monthNames[d.getMonth()]} / ${d.getFullYear()}`;
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ label, value });
  }

  return options;
}

export const Filter = ({ categories }: FilterProps) => {
  const [searchValue, setSearchValue] = useState("");

  const typeOptions = [
    { label: "Todos", value: "all" },
    { label: "Receita", value: "income" },
    { label: "Despesa", value: "expense" },
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
          <CustomInput
            label='Buscar'
            id='search'
            placeholder='Buscar por descrição'
            className='col-span-4 md:col-span-2 lg:col-span-1 mr-4'
            icon={<Search />}
            value={searchValue}
            setValue={setSearchValue}
          />
          <CustomSelect label='Tipo' placeholder='Todos' options={typeOptions} defaultValue='all' />
          <CustomSelect
            label='Categoria'
            placeholder='Todas'
            options={categoryOptions}
            defaultValue='all'
          />
          <CustomSelect
            label='Período'
            placeholder='Todos'
            options={periodOptions}
            defaultValue='all'
          />
        </div>
      </CardContent>
    </Card>
  );
};
