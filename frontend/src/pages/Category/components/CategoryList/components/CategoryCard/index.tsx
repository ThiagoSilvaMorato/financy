import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Edit, Trash } from "lucide-react";
import type { CategoryCardProps } from "./models";
import { handleColorMap } from "@/utils/colorMap";
import { getLucideIcon } from "@/utils/getLucideIcon";

export const CategoryCard = ({
  title,
  description,
  icon,
  color,
  transactionCount,
}: CategoryCardProps) => {
  const { bgStyle, textStyle } = handleColorMap(color);

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='h-10 w-10 flex items-center justify-center rounded-xl' style={bgStyle}>
            <span style={textStyle}>{getLucideIcon(icon) || ""}</span>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              className='w-8 h-8'
              onClick={() => console.log("Deletar categoria")}
            >
              <Trash className='text-red-500' />
            </Button>
            <Button
              variant='outline'
              className='w-8 h-8'
              onClick={() => console.log("Editar categoria")}
            >
              <Edit />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className='flex flex-col'>
          <span className='text-lg font-semibold'>{title}</span>
          <span className='text-sm text-gray-500'>{description}</span>
        </div>
      </CardContent>
      <CardFooter>
        <div className='flex items-center justify-between w-full pt-4'>
          <div className='rounded-full w-auto px-3 py-1 text-sm font-medium' style={bgStyle}>
            <span style={textStyle}>{title}</span>
          </div>
          <span className='text-gray-500'>{transactionCount} itens</span>
        </div>
      </CardFooter>
    </Card>
  );
};
