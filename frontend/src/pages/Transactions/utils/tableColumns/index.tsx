import { extendedColorMap } from "@/utils/colorMap";
import type { TransactionModel } from "../../models";
import { getLucideIcon } from "@/utils/getLucideIcon";
import { CircleArrowDown, CircleArrowUp, Edit, Trash } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { Button } from "@/components/ui/button";
import moment from "moment";

export const tableColumns = () => {
  return [
    {
      accessorKey: "description",
      header: "Descrição",
      align: "left",
      render: (row: TransactionModel) => {
        const { category, description } = row;
        const colorObj = extendedColorMap[category.color] ?? extendedColorMap["green"];
        const hex = colorObj.hex;

        const bgStyle = { backgroundColor: `${hex}33` };
        const textStyle = { color: hex };

        return (
          <div className='flex items-center gap-4'>
            <div className='h-10 w-10 flex items-center justify-center rounded-xl' style={bgStyle}>
              <span style={textStyle}>{getLucideIcon(category.icon || "")}</span>
            </div>
            <span>{description}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "date",
      header: "Data",
      align: "center",
      render: (row: TransactionModel) => {
        return moment(row.date).format("DD/MM/YYYY");
      },
    },
    {
      accessorKey: "category",
      header: "Categoria",
      align: "center",
      render: (row: TransactionModel) => {
        const category = row.category;
        if (!category) return null;

        const colorObj = extendedColorMap[category.color] ?? extendedColorMap["green"];
        const hex = colorObj.hex;
        const bgStyle = { backgroundColor: `${hex}22` };
        const textStyle = { color: hex };

        return (
          <div className='flex items-center justify-center w-full'>
            <div className='inline-flex items-center h-7 px-4 rounded-full' style={bgStyle}>
              <span className='text-sm' style={textStyle}>
                {category.title}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Tipo",
      align: "center",
      render: (row: TransactionModel) => {
        return row.type === "income" ? (
          <div className='flex items-center justify-center gap-2 text-green-500 text-sm'>
            <CircleArrowUp size={20} />
            Entrada
          </div>
        ) : (
          <div className='flex items-center justify-center gap-2 text-red-500 text-sm'>
            <CircleArrowDown size={20} />
            Saída
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Valor",
      align: "center",
      render: (row: TransactionModel) => {
        return `${row.type === "income" ? "+" : "-"} R$ ${formatCurrency(row.amount)}`;
      },
    },
    {
      accessorKey: "actions",
      header: "Ações",
      align: "right",
      render: () => {
        return (
          <div className='flex gap-2 justify-end'>
            <Button variant='outline' size='icon' onClick={() => console.log("handleDelete")}>
              <Trash className='text-red-500' />
            </Button>
            <Button variant='outline' size='icon' onClick={() => console.log("handleEdit")}>
              <Edit />
            </Button>
          </div>
        );
      },
    },
  ];
};
