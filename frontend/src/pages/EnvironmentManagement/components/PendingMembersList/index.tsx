import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { environmentManagementService } from "../../services";
import type { EnvironmentMemberModel } from "@/shared/models/environment";

interface PendingMembersListProps {
  environmentId: string;
  pendingMembers: EnvironmentMemberModel[];
  onChanged: () => Promise<void>;
}

export const PendingMembersList = ({
  environmentId,
  pendingMembers,
  onChanged,
}: PendingMembersListProps) => {
  const handleApprove = async (memberId: string) => {
    try {
      const { data } = await environmentManagementService.approveMember(environmentId, memberId);

      if (data?.approveMember) {
        toast.success("Membro aprovado.");
        await onChanged();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao aprovar membro.");
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      const { data } = await environmentManagementService.removeMember(environmentId, memberId);

      if (data?.removeMember) {
        toast.success("Membro removido.");
        await onChanged();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover membro.");
    }
  };

  if (pendingMembers.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pendentes de aprovação</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-2'>
        {pendingMembers.map((member) => (
          <div
            key={member.id}
            className='flex items-center justify-between gap-3 rounded-md border p-3'
          >
            <div className='flex flex-col overflow-hidden'>
              <span className='font-medium truncate'>{member.user?.name}</span>
              <span className='text-sm text-muted-foreground truncate'>
                {member.user?.email} · entrou em{" "}
                {new Date(member.joinedAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <div className='flex items-center gap-2 shrink-0'>
              <Button variant='outline' size='sm' onClick={() => handleRemove(member.id)}>
                Remover
              </Button>
              <Button size='sm' onClick={() => handleApprove(member.id)}>
                Aprovar
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
