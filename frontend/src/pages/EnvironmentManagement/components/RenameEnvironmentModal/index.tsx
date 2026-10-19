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
import { useEffect } from "react";
import { environmentManagementService } from "../../services";
import type { RenameEnvironmentForm } from "../../models";
import type { Dispatch, SetStateAction } from "react";

const validationSchema = yup.object().shape({
  name: yup.string().trim().required("Nome é obrigatório"),
});

interface RenameEnvironmentModalProps {
  environmentId: string;
  currentName: string;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onRenamed: () => Promise<void>;
}

export const RenameEnvironmentModal = ({
  environmentId,
  currentName,
  isOpen,
  setIsOpen,
  onRenamed,
}: RenameEnvironmentModalProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RenameEnvironmentForm>({
    defaultValues: { name: currentName },
    resolver: yupResolver(validationSchema) as Resolver<RenameEnvironmentForm>,
  });

  useEffect(() => {
    if (isOpen) setValue("name", currentName);
  }, [isOpen, currentName, setValue]);

  const handleFormSubmit = async (formData: RenameEnvironmentForm) => {
    try {
      const { data } = await environmentManagementService.renameEnvironment(
        environmentId,
        formData.name
      );

      if (data?.renameEnvironment) {
        toast.success("Ambiente renomeado com sucesso!");
        setIsOpen(false);
        await onRenamed();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao renomear ambiente.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogHeader>
            <DialogTitle>Renomear ambiente</DialogTitle>
            <DialogDescription>Escolha um novo nome para este ambiente</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 mt-6'>
            <Controller
              name='name'
              control={control}
              render={({ field }) => (
                <CustomInput
                  id='rename-environment'
                  type='text'
                  label='Nome do ambiente'
                  error={errors.name?.message}
                  {...field}
                />
              )}
            />
          </div>

          <DialogFooter className='mt-4'>
            <Button type='submit' className='w-full h-12 text-md font-normal'>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
