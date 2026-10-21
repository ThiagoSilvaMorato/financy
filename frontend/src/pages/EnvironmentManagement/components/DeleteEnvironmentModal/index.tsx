import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { environmentManagementService } from "../../services";
import { useAsyncAction } from "@/hooks/useAsyncAction";

interface DeleteEnvironmentModalProps {
  environmentId: string;
  environmentName: string;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export const DeleteEnvironmentModal = ({
  environmentId,
  environmentName,
  isOpen,
  onClose,
  onDeleted,
}: DeleteEnvironmentModalProps) => {
  const { loading: isDeleting, run } = useAsyncAction();

  const handleConfirm = async () => {
    try {
      const { data } = await environmentManagementService.deleteEnvironment(environmentId);

      if (data?.deleteEnvironment) {
        toast.success("Ambiente excluído com sucesso.");
        onDeleted();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir ambiente.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Excluir ambiente</DialogTitle>

        <div className='mt-4 space-y-5'>
          <DialogDescription className='text-black text-base'>
            Tem certeza que deseja excluir o ambiente {environmentName}? Todas as categorias e
            transações desse ambiente serão apagadas. Essa ação é irreversível.
          </DialogDescription>

          <div className='flex flex-row justify-end gap-3'>
            <Button variant='outline' onClick={onClose}>
              Cancelar
            </Button>
            <Button variant='destructive' loading={isDeleting} onClick={() => run(handleConfirm)}>
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
