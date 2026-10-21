import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { environmentManagementService } from "../../services";
import type { EnvironmentMemberModel } from "@/shared/models/environment";
import { usePendingKeys } from "@/hooks/usePendingKeys";

interface MembersListProps {
  environmentId: string;
  members: EnvironmentMemberModel[];
  isAdmin: boolean;
  currentMemberId?: string;
  onChanged: () => Promise<void>;
}

export const MembersList = ({
  environmentId,
  members,
  isAdmin,
  currentMemberId,
  onChanged,
}: MembersListProps) => {
  const { isPending, run } = usePendingKeys();

  const adminsCount = members.filter((member) => member.role === "admin").length;

  const handlePromote = async (memberId: string) => {
    try {
      const { data } = await environmentManagementService.promoteToAdmin(environmentId, memberId);

      if (data?.promoteToAdmin) {
        toast.success("Membro promovido a Admin.");
        await onChanged();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao promover membro.");
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      const { data } = await environmentManagementService.removeMember(environmentId, memberId);

      if (data?.removeMember) {
        toast.success("Membro removido do ambiente.");
        await onChanged();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover membro.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Membros</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-2'>
        {members.map((member) => {
          const isSelf = member.id === currentMemberId;
          const blocksLastAdmin = member.role === "admin" && adminsCount === 1 && members.length > 1;
          const promoteKey = `${member.id}:promote`;
          const removeKey = `${member.id}:remove`;

          return (
            <div
              key={member.id}
              className='flex items-center justify-between gap-3 rounded-md border p-3'
            >
              <div className='flex flex-col overflow-hidden'>
                <span className='font-medium truncate'>
                  {member.user?.name}
                  {isSelf && " (você)"}
                </span>
                <span className='text-sm text-muted-foreground truncate'>{member.user?.email}</span>
              </div>
              <div className='flex items-center gap-2 shrink-0'>
                <Badge variant='outline'>{member.role === "admin" ? "Admin" : "Membro"}</Badge>
                {isAdmin && !isSelf && (
                  <>
                    {member.role !== "admin" && (
                      <Button
                        variant='outline'
                        size='sm'
                        loading={isPending(promoteKey)}
                        disabled={isPending(removeKey)}
                        onClick={() => run(promoteKey, () => handlePromote(member.id))}
                      >
                        Promover a Admin
                      </Button>
                    )}
                    <Button
                      variant='outline'
                      size='sm'
                      loading={isPending(removeKey)}
                      disabled={blocksLastAdmin || isPending(promoteKey)}
                      title={
                        blocksLastAdmin
                          ? "Promova outro Admin antes de remover este membro"
                          : undefined
                      }
                      onClick={() => run(removeKey, () => handleRemove(member.id))}
                    >
                      Remover
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
