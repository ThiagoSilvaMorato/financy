import { Check, ChevronDown, Home, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useEnvironmentStore } from "@/stores/environment";
import { cn } from "@/lib/utils";
import { useState } from "react";

export const EnvironmentSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { environments, currentEnvironmentId, switchEnvironment } = useEnvironmentStore();

  const currentEnvironment = environments.find((env) => env.id === currentEnvironmentId);

  if (!currentEnvironment) return null;

  const handleSelect = (environmentId: string) => {
    switchEnvironment(environmentId);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant='outline' className='h-9 max-w-52 justify-between'>
          <span className='flex items-center gap-2 truncate'>
            {currentEnvironment.isPersonal ? (
              <Home className='size-4 shrink-0' />
            ) : (
              <Users className='size-4 shrink-0' />
            )}
            <span className='truncate'>{currentEnvironment.name}</span>
          </span>
          <ChevronDown className='size-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent align='end' className='w-64 p-2'>
        <p className='px-2 pb-2 text-xs font-medium text-muted-foreground'>Trocar de ambiente</p>
        <div className='flex flex-col gap-1'>
          {environments.map((environment) => (
            <button
              key={environment.id}
              type='button'
              onClick={() => handleSelect(environment.id)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent",
                environment.id === currentEnvironmentId && "bg-accent"
              )}
            >
              <span className='flex items-center gap-2 truncate'>
                {environment.isPersonal ? (
                  <Home className='size-4 shrink-0' />
                ) : (
                  <Users className='size-4 shrink-0' />
                )}
                <span className='truncate'>{environment.name}</span>
              </span>
              {environment.id === currentEnvironmentId && (
                <Check className='size-4 shrink-0 text-primary' />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
