import { NewCategoryModal } from "../NewCategoryModal";

export const CategoryHeader = () => {
  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-col'>
        <span className='text-2xl font-semibold'>Categorias</span>
        <span className='font-normal text-gray-500'>Organize suas transações por categorias</span>
      </div>
      <NewCategoryModal />
    </div>
  );
};
