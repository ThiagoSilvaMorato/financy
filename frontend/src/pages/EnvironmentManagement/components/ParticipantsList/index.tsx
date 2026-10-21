import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { environmentManagementService } from "../../services";
import { CreateParticipantModal } from "../CreateParticipantModal";
import type { EnvironmentMemberModel } from "@/shared/models/environment";
import { usePendingKeys } from "@/hooks/usePendingKeys";

interface ParticipantsListProps {
  environmentId: string;
  participants: EnvironmentMemberModel[];
  isAdmin: boolean;
  onChanged: () => Promise<void>;
}

export const ParticipantsList = ({
  environmentId,
  participants,
  isAdmin,
  onChanged,
}: ParticipantsListProps) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { isPending, run } = usePendingKeys();

  const handleRemove = async (memberId: string) => {
    try {
      const { data } = await environmentManagementService.removeParticipant(
        environmentId,
        memberId
      );

      if (data?.removeParticipant) {
        toast.success("Participante removido.");
        await onChanged();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover participante.");
    }
  };

  return (
    <Card>
      <CreateParticipantModal
        environmentId={environmentId}
        isOpen={isCreateModalOpen}
        setIsOpen={setIsCreateModalOpen}
        onCreated={onChanged}
      />
      <CardHeader className='flex-row items-center justify-between'>
        <CardTitle>Participantes</CardTitle>
        {isAdmin && (
          <Button size='sm' variant='outline' onClick={() => setIsCreateModalOpen(true)}>
            <Plus />
            Novo participante
          </Button>
        )}
      </CardHeader>
      <CardContent className='flex flex-col gap-2'>
        {participants.length === 0 && (
          <span className='text-sm text-muted-foreground'>Nenhum participante cadastrado</span>
        )}
        {participants.map((participant) => (
          <div
            key={participant.id}
            className='flex items-center justify-between gap-3 rounded-md border p-3'
          >
            <span className='font-medium truncate'>{participant.displayName}</span>
            {isAdmin && (
              <Button
                variant='outline'
                size='sm'
                loading={isPending(participant.id)}
                onClick={() => run(participant.id, () => handleRemove(participant.id))}
              >
                Remover
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
