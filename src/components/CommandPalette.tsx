import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useInstances } from "@/hooks/queries/useInstances";
import { useUserRole } from "@/hooks/useUserRole";
import {
  LayoutDashboard, Server, CreditCard, Activity, GitBranch, Users, Settings, Plus,
} from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: instances = [] } = useInstances();
  const { isSuperAdmin } = useUserRole();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Pesquisar instâncias ou navegar..." />
      <CommandList>
        <CommandEmpty>Sem resultados.</CommandEmpty>

        <CommandGroup heading="Navegação">
          <CommandItem onSelect={() => go("/")}><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</CommandItem>
          <CommandItem onSelect={() => go("/instances")}><Server className="mr-2 h-4 w-4" />Instâncias</CommandItem>
          <CommandItem onSelect={() => go("/instances/new")}><Plus className="mr-2 h-4 w-4" />Nova instância</CommandItem>
          <CommandItem onSelect={() => go("/subscriptions")}><CreditCard className="mr-2 h-4 w-4" />Subscrições</CommandItem>
          <CommandItem onSelect={() => go("/activity")}><Activity className="mr-2 h-4 w-4" />Log de Actividade</CommandItem>
          <CommandItem onSelect={() => go("/updates")}><GitBranch className="mr-2 h-4 w-4" />Atualizações</CommandItem>
          {isSuperAdmin && (
            <>
              <CommandItem onSelect={() => go("/users")}><Users className="mr-2 h-4 w-4" />Utilizadores</CommandItem>
              <CommandItem onSelect={() => go("/settings")}><Settings className="mr-2 h-4 w-4" />Definições</CommandItem>
            </>
          )}
        </CommandGroup>

        {instances.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Instâncias">
              {instances.slice(0, 50).map((inst) => (
                <CommandItem
                  key={inst.id}
                  value={`${inst.business_name} ${inst.owner_name} ${inst.owner_email}`}
                  onSelect={() => go(`/instances/${inst.id}`)}
                >
                  <Server className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{inst.business_name}</span>
                    <span className="text-xs text-muted-foreground">{inst.owner_email}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
