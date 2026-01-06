import { CustomInput } from "@/components/CustomInput";
import { CustomSelect } from "@/components/CustomSelect";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import { useState } from "react";

export const Filter = () => {
  const [searchValue, setSearchValue] = useState("");

  const typeOptions = [
    { label: "Todos", value: "all" },
    { label: "Entrada", value: "income" },
    { label: "Saída", value: "expense" },
  ];
  const categoryOptions = [
    { label: "Todas", value: "all" },
    { label: "Alimentação", value: "food" },
    { label: "Transporte", value: "transport" },
    { label: "Lazer", value: "leisure" },
    { label: "Saúde", value: "health" },
    { label: "Educação", value: "education" },
  ];
  const periodOptions = [
    { label: "Todos", value: "all" },
    { label: "Junho / 2025", value: "2025-06" },
    { label: "Julho / 2025", value: "2025-07" },
    { label: "Agosto / 2025", value: "2025-08" },
    { label: "Setembro / 2025", value: "2025-09" },
    { label: "Outubro / 2025", value: "2025-10" },
    { label: "Novembro / 2025", value: "2025-11" },
    { label: "Dezembro / 2025", value: "2025-12" },
  ];

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
