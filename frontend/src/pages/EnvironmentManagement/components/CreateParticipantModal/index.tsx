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
import { environmentManagementService } from "../../services";
import type { CreateParticipantForm } from "../../models";
import type { Dispatch, SetStateAction } from "react";

const validationSchema = yup.object().shape({
  displayName: yup.string().trim().required("Nome é obrigatório"),
});

interface CreateParticipantModalProps {
  environmentId: string;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onCreated: () => Promise<void>;
}

export const CreateParticipantModal = ({
  environmentId,
  isOpen,
  setIsOpen,
  onCreated,
}: CreateParticipantModalProps) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateParticipantForm>({
    defaultValues: { displayName: "" },
    resolver: yupResolver(validationSchema) as Resolver<CreateParticipantForm>,
  });

  const handleFormSubmit = async (formData: CreateParticipantForm) => {
    try {
      const { data } = await environmentManagementService.createParticipant(
        environmentId,
        formData.displayName
      );

      if (data?.createParticipant) {
        toast.success("Participante criado com sucesso!");
        reset();
        setIsOpen(false);
        await onCreated();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar participante.");
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
            <DialogTitle>Novo participante</DialogTitle>
            <DialogDescription>
              Participantes não têm login, servem apenas para atribuir transações (ex: um filho
              sem conta própria)
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 mt-6'>
            <Controller
              name='displayName'
              control={control}
              render={({ field }) => (
                <CustomInput
                  id='displayName'
                  type='text'
                  label='Nome'
                  placeholder='Ex: João'
                  error={errors.displayName?.message}
                  {...field}
                />
              )}
            />
          </div>

          <DialogFooter className='mt-4'>
            <Button type='submit' className='w-full h-12 text-md font-normal'>
              Criar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
