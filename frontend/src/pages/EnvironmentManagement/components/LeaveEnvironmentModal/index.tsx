import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CustomSelect } from "@/components/CustomSelect";
import { useState } from "react";
import { toast } from "sonner";
import { environmentManagementService } from "../../services";
import type { EnvironmentMemberModel } from "@/shared/models/environment";

interface LeaveEnvironmentModalProps {
  environmentId: string;
  isOpen: boolean;
  onClose: () => void;
  onLeft: () => void;
  requiresNewAdmin: boolean;
  otherMembers: EnvironmentMemberModel[];
}

export const LeaveEnvironmentModal = ({
  environmentId,
  isOpen,
  onClose,
  onLeft,
  requiresNewAdmin,
  otherMembers,
}: LeaveEnvironmentModalProps) => {
  const [newAdminMemberId, setNewAdminMemberId] = useState("select");

  const newAdminOptions = [
    { label: "Selecione", value: "select", disabled: true },
    ...otherMembers.map((member) => ({
      label: member.user?.name ?? "",
      value: member.id,
    })),
  ];

  const handleConfirm = async () => {
    if (requiresNewAdmin && newAdminMemberId === "select") {
      toast.error("Selecione um novo Admin antes de sair.");
      return;
    }

    try {
      const { data } = await environmentManagementService.leaveEnvironment(
        environmentId,
        requiresNewAdmin ? newAdminMemberId : undefined
      );

      if (data?.leaveEnvironment) {
        toast.success("Você saiu do ambiente.");
        onLeft();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao sair do ambiente.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Sair do ambiente</DialogTitle>

        <div className='mt-4 space-y-5'>
          <DialogDescription className='text-black text-base'>
            {requiresNewAdmin
              ? "Você é o último Admin deste ambiente. Escolha quem assumirá como Admin antes de sair."
              : "Tem certeza que deseja sair deste ambiente?"}
          </DialogDescription>

          {requiresNewAdmin && (
            <CustomSelect
              label='Novo Admin'
              placeholder='Selecione'
              options={newAdminOptions}
              value={newAdminMemberId}
              onSelect={setNewAdminMemberId}
            />
          )}

          <div className='flex flex-row justify-end gap-3'>
            <Button variant='outline' onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>Confirmar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
