import Divider from "@/components/Divider";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { Category } from "./components/Category";
import { useNavigate } from "react-router";

const mockedCategories = [
  { id: 1, name: "Alimentação", color: "green", itemsAmount: 12, totalAmount: 1250.75 },
  { id: 2, name: "Transporte", color: "blue", itemsAmount: 8, totalAmount: 600.0 },
  { id: 3, name: "Lazer", color: "purple", itemsAmount: 5, totalAmount: 300.5 },
  { id: 4, name: "Saúde", color: "red", itemsAmount: 3, totalAmount: 450.25 },
];

export const Categories = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <div className='h-12 flex items-center justify-between p-4'>
        <span className='text-gray-500 text-xs'>CATEGORIAS</span>
        <span
          className='text-[#357d56] hover:underline cursor-pointer flex items-center'
          onClick={() => navigate("/categories")}
        >
          Gerenciar <ChevronRight size={20} />
        </span>
      </div>
      <Divider />
      {mockedCategories.map((category) => (
        <Category
          key={category.id}
          name={category.name}
          color={category.color}
          itemsAmount={category.itemsAmount}
          totalAmount={category.totalAmount}
        />
      ))}
    </Card>
  );
};
