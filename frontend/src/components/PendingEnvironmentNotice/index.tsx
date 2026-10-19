import { Clock } from "lucide-react";

export const PendingEnvironmentNotice = () => {
  return (
    <div className='flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-12 text-center'>
      <Clock className='size-10 text-muted-foreground' />
      <p className='text-lg font-medium'>Aguardando aprovação</p>
      <p className='max-w-sm text-sm text-muted-foreground'>
        Sua entrada neste ambiente está aguardando aprovação de um administrador.
      </p>
    </div>
  );
};
