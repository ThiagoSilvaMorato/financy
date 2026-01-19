import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface ConfirmDeleteTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  transactionTitle: string;
}

export const ConfirmDeleteTransactionModal = ({
  isOpen,
  onClose,
  onConfirm,
  transactionTitle,
}: ConfirmDeleteTransactionModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Deletar Transação</DialogTitle>

        <div className='mt-4 space-y-5'>
          <DialogDescription className='text-black text-base'>
            Tem certeza que deseja deletar a transação {transactionTitle}? Essa ação é irreversível
          </DialogDescription>

          <div className='flex flex-row justify-end gap-3'>
            <Button variant='outline' onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={onConfirm}>Confirmar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
