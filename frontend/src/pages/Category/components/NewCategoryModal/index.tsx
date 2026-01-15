import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Controller, useForm, type Resolver } from "react-hook-form";
import type { NewCategoryForm, NewCategoryModalProps } from "./models";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { CustomInput } from "@/components/CustomInput";
import { IconSelection } from "./components/IconSelection";
import { ColorSelection } from "./components/ColorSelection";
import { toast } from "sonner";
import { useEffect } from "react";
import { categoryService } from "../../services";

const validationSchema = yup.object().shape({
  title: yup.string().trim().required("Título é obrigatório"),
  description: yup.string().trim(),
  icon: yup.string().trim().required("Ícone é obrigatório"),
  color: yup.string().trim().required("Cor é obrigatória"),
});

export const NewCategoryModal = ({
  isOpen,
  setIsOpen,
  fetchData,
  isEdit,
  setIsEdit,
  categoryInfo,
  setCategoryInfo,
}: NewCategoryModalProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<NewCategoryForm>({
    defaultValues: {
      title: "",
      description: "",
      icon: "",
      color: "",
    },
    resolver: yupResolver(validationSchema) as Resolver<NewCategoryForm>,
  });

  const handleFormSubmit = async (formData: NewCategoryForm) => {
    if (isEdit && !categoryInfo) {
      toast.error("Informações da categoria para edição estão ausentes. Tente novamente.");
      return;
    }

    const payload = {
      title: formData.title,
      description: formData.description,
      icon: formData.icon,
      color: formData.color,
    };

    if (isEdit) {
      try {
        const { data } = await categoryService.updateCategory({
          id: categoryInfo!.id!,
          ...payload,
        });

        if (data?.updateCategory) {
          toast.success("Categoria atualizada com sucesso!");
          reset();
          setIsOpen(false);
          setIsEdit(false);
          setCategoryInfo(null);

          if (fetchData) {
            await fetchData();
          }
        }
      } catch {
        toast.error("Erro ao atualizar categoria.");
      }
    } else {
      try {
        const { data } = await categoryService.createCategory(payload);

        if (data?.createCategory) {
          toast.success("Categoria criada com sucesso!");
          reset();
          setIsOpen(false);

          if (fetchData) {
            await fetchData();
          }
        }
      } catch {
        toast.error("Erro ao criar nova categoria.");
      }
    }
  };

  const handleModalOpenStateChange = (isOpen: boolean) => {
    setIsOpen(isOpen);
    if (!isOpen) {
      setIsEdit(false);
      setCategoryInfo(null);
      reset();
    }
  };

  useEffect(() => {
    if (isEdit && categoryInfo) {
      setValue("title", categoryInfo.title);
      setValue("description", categoryInfo.description);
      setValue("icon", categoryInfo.icon);
      setValue("color", categoryInfo.color);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Dialog onOpenChange={handleModalOpenStateChange} open={isOpen}>
      <DialogContent>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            <DialogDescription>Organize suas transações com categorias</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 mt-6'>
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
            <Controller
              name='color'
              control={control}
              render={({ field }) => (
                <ColorSelection
                  value={field.value}
                  setValue={(color) => {
                    field.onChange(color);
                  }}
                  error={errors.color?.message}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button type='submit' className='w-full h-12 text-md font-normal'>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
