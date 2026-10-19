import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { environmentManagementService } from "../../services";
import type { EnvironmentInviteModel } from "@/shared/models/environment";

interface SentInvitesProps {
  invites: EnvironmentInviteModel[];
  onChanged: () => Promise<void>;
}

export const SentInvites = ({ invites, onChanged }: SentInvitesProps) => {
  const handleCancel = async (inviteId: string) => {
    try {
      const { data } = await environmentManagementService.cancelEnvironmentInvite(inviteId);

      if (data?.cancelEnvironmentInvite) {
        toast.success("Convite cancelado.");
        await onChanged();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cancelar convite.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convites enviados</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-2'>
        {invites.length === 0 && (
          <span className='text-sm text-muted-foreground'>Nenhum convite pendente</span>
        )}
        {invites.map((invite) => (
          <div
            key={invite.id}
            className='flex items-center justify-between gap-3 rounded-md border p-3'
          >
            <div className='flex flex-col overflow-hidden'>
              <span className='text-sm truncate'>
                {invite.invitedUser
                  ? `${invite.invitedUser.name} (${invite.invitedUser.email})`
                  : "Convidado"}
              </span>
              <span className='text-sm text-muted-foreground'>
                Expira em {new Date(invite.expiresAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <Badge variant='outline'>{invite.role === "admin" ? "Admin" : "Membro"}</Badge>
              <Button variant='outline' size='sm' onClick={() => handleCancel(invite.id)}>
                Cancelar
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
