import Divider from "@/components/Divider";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { Category } from "./components/Category";
import { useNavigate } from "react-router";
import type { CategoriesProps } from "./components/models";

export const Categories = ({ categories }: CategoriesProps) => {
  const navigate = useNavigate();

  return (
    <Card className='h-fit'>
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
      <div className='space-y-4 p-4'>
        {categories.map((category) => (
          <Category
            key={category.id}
            name={category.title}
            color={category.color}
            itemsAmount={category.transactionsCount}
            totalAmount={category.totalAmount}
          />
        ))}
      </div>
    </Card>
  );
};
