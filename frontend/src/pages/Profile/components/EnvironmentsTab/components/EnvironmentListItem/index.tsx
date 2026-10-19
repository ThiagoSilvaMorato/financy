import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Users } from "lucide-react";
import { useNavigate } from "react-router";
import type { EnvironmentModel } from "@/shared/models/environment";

interface EnvironmentListItemProps {
  environment: EnvironmentModel;
}

export const EnvironmentListItem = ({ environment }: EnvironmentListItemProps) => {
  const navigate = useNavigate();

  const myRole = environment.myMembership?.role;

  return (
    <Card>
      <CardContent className='flex items-center justify-between gap-3 p-4'>
        <div className='flex items-center gap-3 overflow-hidden'>
          {environment.isPersonal ? (
            <Home className='size-5 shrink-0 text-muted-foreground' />
          ) : (
            <Users className='size-5 shrink-0 text-muted-foreground' />
          )}
          <div className='flex flex-col overflow-hidden'>
            <span className='font-medium truncate'>{environment.name}</span>
            <div className='flex items-center gap-2 mt-1'>
              {environment.isPersonal && <Badge variant='secondary'>Pessoal</Badge>}
              {myRole === "pending" ? (
                <Badge variant='outline'>Aguardando aprovação</Badge>
              ) : (
                myRole && <Badge variant='outline'>{myRole === "admin" ? "Admin" : "Membro"}</Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => navigate(`/environments/${environment.id}`)}
        >
          Gerenciar
        </Button>
      </CardContent>
    </Card>
  );
};
