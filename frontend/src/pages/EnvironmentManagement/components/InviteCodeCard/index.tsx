import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Copy, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { environmentManagementService } from "../../services";
import type { EnvironmentInviteCodeModel } from "@/shared/models/environment";

interface InviteCodeCardProps {
  environmentId: string;
}

export const InviteCodeCard = ({ environmentId }: InviteCodeCardProps) => {
  const [inviteCode, setInviteCode] = useState<EnvironmentInviteCodeModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerateOpen, setIsRegenerateOpen] = useState(false);

  const fetchCurrentCode = useCallback(async () => {
    try {
      const { data } = await environmentManagementService.getCurrentInviteCode(environmentId);
      setInviteCode(data?.getCurrentInviteCode ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao buscar código de convite.");
    } finally {
      setIsLoading(false);
    }
  }, [environmentId]);

  useEffect(() => {
    fetchCurrentCode();
  }, [fetchCurrentCode]);

  const isActive = !!inviteCode && new Date(inviteCode.expiresAt) > new Date();

  const handleGenerate = async () => {
    try {
      const { data } = await environmentManagementService.generateEnvironmentInviteCode(
        environmentId
      );

      if (data?.generateEnvironmentInviteCode) {
        setInviteCode(data.generateEnvironmentInviteCode);
        setIsRegenerateOpen(false);
        toast.success("Código de convite gerado com sucesso!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar código de convite.");
    }
  };

  const handleCopy = async () => {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(inviteCode.code);
      toast.success("Código copiado!");
    } catch {
      toast.error("Não foi possível copiar o código. Copie manualmente.");
    }
  };

  if (isLoading) return null;

  return (
    <Card>
      <Dialog open={isRegenerateOpen} onOpenChange={setIsRegenerateOpen}>
        <DialogContent>
          <DialogTitle>Gerar novo código</DialogTitle>
          <div className='mt-4 space-y-5'>
            <DialogDescription className='text-black text-base'>
              Isso vai invalidar o código atual — quem ainda não entrou com ele vai precisar do
              novo código.
            </DialogDescription>
            <div className='flex flex-row justify-end gap-3'>
              <Button variant='outline' onClick={() => setIsRegenerateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGenerate}>Confirmar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CardHeader>
        <CardTitle>Código de convite</CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-3'>
        {isActive && inviteCode ? (
          <>
            <div className='flex items-center justify-between gap-3 rounded-md border p-3'>
              <div className='flex flex-col'>
                <span className='font-mono text-lg tracking-wider'>{inviteCode.code}</span>
                <span className='text-sm text-muted-foreground'>
                  Expira em {new Date(inviteCode.expiresAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <Button variant='outline' size='sm' onClick={handleCopy}>
                <Copy />
                Copiar código
              </Button>
            </div>
            <Button
              variant='outline'
              size='sm'
              className='self-start'
              onClick={() => setIsRegenerateOpen(true)}
            >
              <RefreshCw />
              Gerar novo código
            </Button>
          </>
        ) : (
          <Button size='sm' className='self-start' onClick={handleGenerate}>
            <RefreshCw />
            Gerar código de convite
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
