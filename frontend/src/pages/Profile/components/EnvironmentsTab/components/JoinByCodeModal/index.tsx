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
import { useState } from "react";
import { environmentsTabService } from "../../services";
import type { JoinByCodeForm } from "../../models";
import type { Dispatch, SetStateAction } from "react";
import { useAsyncAction } from "@/hooks/useAsyncAction";

const validationSchema = yup.object().shape({
  code: yup.string().trim().required("Código é obrigatório"),
});

interface JoinByCodeModalProps {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  onJoined: () => Promise<void>;
}

export const JoinByCodeModal = ({ isOpen, setIsOpen, onJoined }: JoinByCodeModalProps) => {
  const [previewEnvironment, setPreviewEnvironment] = useState<{ id: string; name: string } | null>(
    null
  );

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    getValues,
  } = useForm<JoinByCodeForm>({
    defaultValues: { code: "" },
    resolver: yupResolver(validationSchema) as Resolver<JoinByCodeForm>,
  });

  const { loading: isConfirming, run } = useAsyncAction();

  const handlePreview = async (formData: JoinByCodeForm) => {
    try {
      const { data } = await environmentsTabService.getEnvironmentByInviteCode(formData.code);

      if (data?.getEnvironmentByInviteCode) {
        setPreviewEnvironment(data.getEnvironmentByInviteCode);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Código inválido ou expirado.");
    }
  };

  const handleConfirm = async () => {
    try {
      const { data } = await environmentsTabService.joinEnvironmentByCode(getValues("code"));

      if (data?.joinEnvironmentByCode) {
        toast.success("Solicitação enviada! Aguarde a aprovação de um administrador.");
        handleClose();
        await onJoined();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao entrar no ambiente.");
      setPreviewEnvironment(null);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setPreviewEnvironment(null);
    reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setIsOpen(true);
    } else {
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        {!previewEnvironment ? (
          <form onSubmit={handleSubmit(handlePreview)}>
            <DialogHeader>
              <DialogTitle>Entrar com código</DialogTitle>
              <DialogDescription>
                Digite o código de convite compartilhado por um Admin do ambiente
              </DialogDescription>
            </DialogHeader>
            <div className='grid gap-4 mt-6'>
              <Controller
                name='code'
                control={control}
                render={({ field }) => (
                  <CustomInput
                    id='code'
                    type='text'
                    label='Código de convite'
                    placeholder='Ex: AB23CD45'
                    error={errors.code?.message}
                    {...field}
                  />
                )}
              />
            </div>
            <DialogFooter className='mt-4'>
              <Button type='submit' className='w-full h-12 text-md font-normal' loading={isSubmitting}>
                Continuar
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogTitle>Confirmar entrada</DialogTitle>
            <div className='mt-4 space-y-5'>
              <DialogDescription className='text-black text-base'>
                Deseja entrar no ambiente <strong>{previewEnvironment.name}</strong>? Você ficará
                com acesso pendente até um administrador aprovar sua entrada.
              </DialogDescription>
              <div className='flex flex-row justify-end gap-3'>
                <Button variant='outline' onClick={() => setPreviewEnvironment(null)}>
                  Voltar
                </Button>
                <Button loading={isConfirming} onClick={() => run(handleConfirm)}>
                  Confirmar
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
