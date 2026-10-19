import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useEnvironmentStore } from "@/stores/environment";
import { environmentsTabService } from "./services";
import { CreateEnvironmentModal } from "./components/CreateEnvironmentModal";
import { EnvironmentListItem } from "./components/EnvironmentListItem";
import { PendingInvites } from "./components/PendingInvites";
import type { EnvironmentInviteModel } from "@/shared/models/environment";

export const EnvironmentsTab = () => {
  const navigate = useNavigate();
  const { environments, refreshEnvironments, switchEnvironment } = useEnvironmentStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<EnvironmentInviteModel[]>([]);

  const fetchPendingInvites = useCallback(async () => {
    const { data } = await environmentsTabService.listMyPendingInvites();
    setPendingInvites(data?.listMyPendingInvites || []);
  }, []);

  useEffect(() => {
    refreshEnvironments();
    fetchPendingInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePendingInvitesChange = async () => {
    await Promise.all([fetchPendingInvites(), refreshEnvironments()]);
  };

  const handleEnvironmentCreated = (environmentId: string) => {
    switchEnvironment(environmentId);
    navigate(`/environments/${environmentId}`);
  };

  return (
    <div className='flex flex-col gap-6'>
      <CreateEnvironmentModal
        isOpen={isCreateModalOpen}
        setIsOpen={setIsCreateModalOpen}
        onCreated={handleEnvironmentCreated}
      />

      <PendingInvites invites={pendingInvites} onChange={handlePendingInvitesChange} />

      <div className='flex flex-col gap-2'>
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium text-muted-foreground'>Meus ambientes</span>
          <Button size='sm' onClick={() => setIsCreateModalOpen(true)}>
            <Plus />
            Criar ambiente conjunto
          </Button>
        </div>

        {environments.map((environment) => (
          <EnvironmentListItem key={environment.id} environment={environment} />
        ))}
      </div>
    </div>
  );
};
