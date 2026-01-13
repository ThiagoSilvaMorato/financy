import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import type { NewCategoryForm } from "./models";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { CustomInput } from "@/components/CustomInput";
import { IconSelection } from "./components/IconSelection";

const validationSchema = yup.object().shape({
  title: yup.string().trim().required("Título é obrigatório"),
  description: yup.string().trim(),
  icon: yup.string().trim().required("Ícone é obrigatório"),
  color: yup.string().trim().required("Cor é obrigatória"),
});

export const NewCategoryModal = () => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<NewCategoryForm>({
    defaultValues: {
      title: "",
      description: "",
      icon: "",
      color: "",
    },
    resolver: yupResolver(validationSchema) as Resolver<NewCategoryForm>,
  });

  const handleFormSubmit = async (data: NewCategoryForm) => {
    console.log(data);
  };

  const handleCloseModal = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
    }
  };

  return (
    <Dialog onOpenChange={handleCloseModal}>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogTrigger asChild>
          <Button onClick={() => console.log("Abrir modal de nova categoria")}>
            <Plus />
            Nova Categoria
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>Organize suas transações com categorias</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4'>
            <Controller
              name='title'
              control={control}
              render={({ field }) => (
                <CustomInput
                  id='title'
                  type='text'
                  label='Título'
                  placeholder='Ex: Alimentação'
                  error={errors.title?.message}
                  {...field}
                />
              )}
            />
            <Controller
              name='description'
              control={control}
              render={({ field }) => (
                <CustomInput
                  id='description'
                  type='text'
                  label='Descrição'
                  placeholder='Descrição da categoria'
                  error={errors.description?.message}
                  {...field}
                />
              )}
            />
            <Controller
              name='icon'
              control={control}
              render={({ field }) => (
                <IconSelection
                  value={field.value}
                  setValue={(icon) => {
                    field.onChange(icon);
                  }}
                  error={errors.icon?.message}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button type='submit' className='w-full h-12 text-md font-normal'>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
};
