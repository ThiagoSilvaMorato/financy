import { Page } from "@/components/Page";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useEnvironmentStore } from "@/stores/environment";
import { PendingEnvironmentNotice } from "@/components/PendingEnvironmentNotice";
import { environmentManagementService } from "./services";
import { EnvironmentManagementHeader } from "./components/EnvironmentManagementHeader";
import { MembersList } from "./components/MembersList";
import { ParticipantsList } from "./components/ParticipantsList";
import { InviteCodeCard } from "./components/InviteCodeCard";
import { PendingMembersList } from "./components/PendingMembersList";
import { RenameEnvironmentModal } from "./components/RenameEnvironmentModal";
import { LeaveEnvironmentModal } from "./components/LeaveEnvironmentModal";
import { DeleteEnvironmentModal } from "./components/DeleteEnvironmentModal";

export const EnvironmentManagement = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { environments, refreshEnvironments } = useEnvironmentStore();

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [hasCheckedAccess, setHasCheckedAccess] = useState(false);

  const environment = environments.find((env) => env.id === id);

  useEffect(() => {
    (async () => {
      await refreshEnvironments();
      setHasCheckedAccess(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (hasCheckedAccess && !environment) {
      toast.error("Você não tem acesso a este ambiente.");
      navigate("/profile");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCheckedAccess, environment]);

  if (!id) return null;

  if (!environment) {
    return (
      <Page>
        <p className='text-gray-500'>Carregando ambiente...</p>
      </Page>
    );
  }

  // O ambiente da rota (`:id`) não é necessariamente o ambiente ativo globalmente — alguém pode
  // ser Admin no ambiente ativo e `pending` em outro que tentou gerenciar por engano. A checagem
  // usa sempre `myMembership` do ambiente resolvido aqui, nunca o hook do ambiente ativo.
  if (environment.myMembership?.role === "pending") {
    return (
      <Page>
        <PendingEnvironmentNotice />
      </Page>
    );
  }

  const isAdmin = environment.myMembership?.role === "admin";
  const currentMemberId = environment.myMembership?.id;

  const activeRealMembers = (environment.members ?? []).filter(
    (member) => member.userId && !member.removedAt
  );
  const participants = (environment.members ?? []).filter(
    (member) => !member.userId && !member.removedAt
  );
  const pendingMembers = environment.pendingMembers ?? [];

  const adminsCount = activeRealMembers.filter((member) => member.role === "admin").length;
  const requiresNewAdminToLeave =
    isAdmin && adminsCount === 1 && activeRealMembers.length > 1;
  const canLeave = activeRealMembers.length > 1;
  const canDelete = isAdmin && !environment.isPersonal && activeRealMembers.length === 1;

  const handleChanged = async () => {
    await refreshEnvironments();
  };

  const handleSetDefault = async () => {
    try {
      const { data } = await environmentManagementService.setDefaultEnvironment(id);

      if (data?.setDefaultEnvironment) {
        toast.success("Ambiente definido como padrão no login.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao definir ambiente padrão.");
    }
  };

  const handleLeft = async () => {
    setIsLeaveOpen(false);
    await refreshEnvironments();
    navigate("/profile");
  };

  const handleDeleted = async () => {
    setIsDeleteOpen(false);
    await refreshEnvironments();
    navigate("/profile");
  };

  return (
    <Page>
      <RenameEnvironmentModal
        environmentId={id}
        currentName={environment.name}
        isOpen={isRenameOpen}
        setIsOpen={setIsRenameOpen}
        onRenamed={handleChanged}
      />
      <LeaveEnvironmentModal
        environmentId={id}
        isOpen={isLeaveOpen}
        onClose={() => setIsLeaveOpen(false)}
        onLeft={handleLeft}
        requiresNewAdmin={requiresNewAdminToLeave}
        otherMembers={activeRealMembers.filter((member) => member.id !== currentMemberId)}
      />
      <DeleteEnvironmentModal
        environmentId={id}
        environmentName={environment.name}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={handleDeleted}
      />

      <div className='flex flex-col gap-6'>
        <EnvironmentManagementHeader
          environment={environment}
          isAdmin={isAdmin}
          canLeave={canLeave}
          canDelete={canDelete}
          onRename={() => setIsRenameOpen(true)}
          onSetDefault={handleSetDefault}
          onLeave={() => setIsLeaveOpen(true)}
          onDelete={() => setIsDeleteOpen(true)}
        />

        <MembersList
          environmentId={id}
          members={activeRealMembers}
          isAdmin={isAdmin}
          currentMemberId={currentMemberId}
          onChanged={handleChanged}
        />

        <ParticipantsList
          environmentId={id}
          participants={participants}
          isAdmin={isAdmin}
          onChanged={handleChanged}
        />

        {isAdmin && !environment.isPersonal && (
          <>
            <InviteCodeCard environmentId={id} />
            <PendingMembersList
              environmentId={id}
              pendingMembers={pendingMembers}
              onChanged={handleChanged}
            />
          </>
        )}
      </div>
    </Page>
  );
};
