import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Pencil, Star, Trash } from "lucide-react";
import { useNavigate } from "react-router";
import type { EnvironmentModel } from "@/shared/models/environment";
import { useAsyncAction } from "@/hooks/useAsyncAction";

interface EnvironmentManagementHeaderProps {
  environment: EnvironmentModel;
  isAdmin: boolean;
  canLeave: boolean;
  canDelete: boolean;
  onRename: () => void;
  onSetDefault: () => Promise<void> | void;
  onLeave: () => void;
  onDelete: () => void;
}

export const EnvironmentManagementHeader = ({
  environment,
  isAdmin,
  canLeave,
  canDelete,
  onRename,
  onSetDefault,
  onLeave,
  onDelete,
}: EnvironmentManagementHeaderProps) => {
  const navigate = useNavigate();
  const { loading: isSettingDefault, run } = useAsyncAction();

  return (
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-3'>
        <Button variant='outline' size='icon' onClick={() => navigate("/profile")}>
          <ArrowLeft />
        </Button>
        <div className='flex flex-col'>
          <div className='flex items-center gap-2'>
            <span className='text-2xl font-semibold'>{environment.name}</span>
            {environment.isPersonal && <Badge variant='secondary'>Pessoal</Badge>}
            {isAdmin && (
              <Button variant='ghost' size='icon' onClick={onRename}>
                <Pencil className='size-4' />
              </Button>
            )}
          </div>
          <span className='font-normal text-gray-500'>Gerencie os membros deste ambiente</span>
        </div>
      </div>
      <div className='flex items-center gap-2'>
        <Button variant='outline' loading={isSettingDefault} onClick={() => run(onSetDefault)}>
          {!isSettingDefault && <Star />}
          Definir como padrão
        </Button>
        <Button
          variant='outline'
          disabled={!canLeave}
          title={!canLeave ? "Você é o único membro deste ambiente" : undefined}
          onClick={onLeave}
        >
          <LogOut />
          Sair do ambiente
        </Button>
        {isAdmin && (
          <Button
            variant='destructive'
            disabled={!canDelete}
            title={
              !canDelete
                ? "Só é possível excluir quando restar 1 membro ativo, e nunca o ambiente pessoal"
                : undefined
            }
            onClick={onDelete}
          >
            <Trash />
            Excluir ambiente
          </Button>
        )}
      </div>
    </div>
  );
};
