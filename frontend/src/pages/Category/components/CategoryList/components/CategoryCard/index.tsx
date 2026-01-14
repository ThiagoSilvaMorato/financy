import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Edit, Trash } from "lucide-react";
import type { CategoryCardProps } from "./models";
import { handleColorMap } from "@/utils/colorMap";
import { getLucideIcon } from "@/utils/getLucideIcon";
import { toast } from "sonner";
import { ConfirmDeleteCategoryModal } from "./ConfirmDeleteCategoryModal";
import { useState } from "react";
import { categoryService } from "@/pages/Category/services";

export const CategoryCard = ({
  id,
  title,
  description,
  icon,
  color,
  transactionCount,
  fetchData,
  setIsEditMode,
  setCategoryToBeEdited,
  setIsNewCategoryModalOpen,
}: CategoryCardProps) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { bgStyle, textStyle } = handleColorMap(color);

  const handleDeleteCategory = async () => {
    try {
      const { data } = await categoryService.deleteCategory(id);

      if (data?.deleteCategory) {
        toast.success("Categoria deletada com sucesso.");
        fetchData();
      }
    } catch {
      toast.error("Erro ao deletar categoria.");
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
  };

  const handleOpenDeleteModal = () => {
    setIsDeleteModalOpen(true);
  };

  const handleOpenEditCategoryModal = () => {
    setCategoryToBeEdited({
      id,
      title,
      description,
      icon,
      color,
      transactionsCount: transactionCount,
    });
    setIsEditMode(true);
    setIsNewCategoryModalOpen(true);
  };

  return (
    <Card className='h-full flex flex-col'>
      <ConfirmDeleteCategoryModal
        isOpen={isDeleteModalOpen}
        onConfirm={handleDeleteCategory}
        onClose={handleCloseDeleteModal}
        categoryTitle={title}
      />
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='h-10 w-10 flex items-center justify-center rounded-xl' style={bgStyle}>
            <span style={textStyle}>{getLucideIcon(icon) || ""}</span>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' className='w-8 h-8' onClick={handleOpenDeleteModal}>
              <Trash className='text-red-500' />
            </Button>
            <Button variant='outline' className='w-8 h-8' onClick={handleOpenEditCategoryModal}>
              <Edit />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className='flex-1'>
        <div className='flex flex-col'>
          <span className='text-lg font-semibold'>{title}</span>
          <span className='text-sm text-gray-500'>{description}</span>
        </div>
      </CardContent>
      <CardFooter className='mt-auto'>
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
