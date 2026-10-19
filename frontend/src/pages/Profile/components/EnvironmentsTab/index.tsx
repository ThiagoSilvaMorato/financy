import { Button } from "@/components/ui/button";
import { KeyRound, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useEnvironmentStore } from "@/stores/environment";
import { CreateEnvironmentModal } from "./components/CreateEnvironmentModal";
import { JoinByCodeModal } from "./components/JoinByCodeModal";
import { EnvironmentListItem } from "./components/EnvironmentListItem";

export const EnvironmentsTab = () => {
  const navigate = useNavigate();
  const { environments, refreshEnvironments, switchEnvironment } = useEnvironmentStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  useEffect(() => {
    refreshEnvironments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnvironmentCreated = (environmentId: string) => {
    switchEnvironment(environmentId);
    navigate(`/environments/${environmentId}`);
  };

  const handleJoined = async () => {
    await refreshEnvironments();
  };

  return (
    <div className='flex flex-col gap-6'>
      <CreateEnvironmentModal
        isOpen={isCreateModalOpen}
        setIsOpen={setIsCreateModalOpen}
        onCreated={handleEnvironmentCreated}
      />

      <JoinByCodeModal isOpen={isJoinModalOpen} setIsOpen={setIsJoinModalOpen} onJoined={handleJoined} />

      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium text-muted-foreground'>Meus ambientes</span>
          <div className='flex items-center gap-2'>
            <Button size='sm' variant='outline' onClick={() => setIsJoinModalOpen(true)}>
              <KeyRound />
              Entrar com código
            </Button>
            <Button size='sm' onClick={() => setIsCreateModalOpen(true)}>
              <Plus />
              Criar ambiente conjunto
            </Button>
          </div>
        </div>

        {environments.map((environment) => (
          <EnvironmentListItem key={environment.id} environment={environment} />
        ))}
      </div>
    </div>
  );
};
