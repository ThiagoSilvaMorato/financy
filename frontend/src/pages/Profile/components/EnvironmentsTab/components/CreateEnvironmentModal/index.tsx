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
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { CustomInput } from "@/components/CustomInput";
import { toast } from "sonner";
import { environmentsTabService } from "../../services";
import type { NewEnvironmentForm } from "../../models";
import type { Dispatch, SetStateAction } from "react";

const validationSchema = yup.object().shape({
  name: yup.string().trim().required("Nome é obrigatório"),
});

interface CreateEnvironmentModalProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onCreated: (environmentId: string) => void;
}

export const CreateEnvironmentModal = ({
  isOpen,
  setIsOpen,
  onCreated,
}: CreateEnvironmentModalProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NewEnvironmentForm>({
    defaultValues: { name: "" },
    resolver: yupResolver(validationSchema) as Resolver<NewEnvironmentForm>,
  });

  const handleFormSubmit = async (formData: NewEnvironmentForm) => {
    try {
      const { data } = await environmentsTabService.createEnvironment(formData.name);

      if (data?.createEnvironment) {
        toast.success("Ambiente criado com sucesso!");
        reset();
        setIsOpen(false);
        onCreated(data.createEnvironment.id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar ambiente.");
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogHeader>
            <DialogTitle>Criar ambiente conjunto</DialogTitle>
            <DialogDescription>
              Crie um ambiente para compartilhar com outras pessoas, como uma conta conjunta
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 mt-6'>
            <Controller
              name='name'
              control={control}
              render={({ field }) => (
                <CustomInput
                  id='name'
                  type='text'
                  label='Nome do ambiente'
                  placeholder='Ex: Conta da casa'
                  error={errors.name?.message}
                  {...field}
                />
              )}
            />
          </div>

          <DialogFooter className='mt-4'>
            <Button type='submit' className='w-full h-12 text-md font-normal' loading={isSubmitting}>
              Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
