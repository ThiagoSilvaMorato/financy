import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { environmentsTabService } from "../../services";
import type { EnvironmentInviteModel } from "@/shared/models/environment";

interface PendingInvitesProps {
  invites: EnvironmentInviteModel[];
  onChange: () => Promise<void>;
}

export const PendingInvites = ({ invites, onChange }: PendingInvitesProps) => {
  const handleAccept = async (inviteId: string) => {
    try {
      const { data } = await environmentsTabService.acceptEnvironmentInvite(inviteId);

      if (data?.acceptEnvironmentInvite) {
        toast.success("Convite aceito com sucesso!");
        await onChange();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao aceitar convite.");
    }
  };

  const handleDecline = async (inviteId: string) => {
    try {
      const { data } = await environmentsTabService.declineEnvironmentInvite(inviteId);

      if (data?.declineEnvironmentInvite) {
        toast.success("Convite recusado.");
        await onChange();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao recusar convite.");
    }
  };

  if (invites.length === 0) return null;

  return (
    <div className='flex flex-col gap-2'>
      <span className='text-sm font-medium text-muted-foreground'>Convites pendentes</span>
      {invites.map((invite) => (
        <Card key={invite.id}>
          <CardContent className='flex items-center justify-between gap-3 p-4'>
            <div className='flex flex-col overflow-hidden'>
              <span className='font-medium truncate'>{invite.environment.name}</span>
              <span className='text-sm text-muted-foreground truncate'>
                Convite de {invite.invitedBy.name} · papel: {invite.role === "admin" ? "Admin" : "Membro"}
              </span>
            </div>
            <div className='flex gap-2 shrink-0'>
              <Button variant='outline' size='sm' onClick={() => handleDecline(invite.id)}>
                Recusar
              </Button>
              <Button size='sm' onClick={() => handleAccept(invite.id)}>
                Aceitar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
