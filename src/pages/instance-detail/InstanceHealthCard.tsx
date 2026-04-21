import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Instance = Database["public"]["Tables"]["instances"]["Row"];

interface Props {
  instance: Instance;
  checking: boolean;
  onCheck: () => void;
}

export function InstanceHealthCard({ instance, checking, onCheck }: Props) {
  return (
    <div className="glass-card p-5">
      <h2 className="text-lg font-semibold mb-3 font-heading">Health Check</h2>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Último resultado:</span>
            <StatusBadge status={instance.health_status} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {instance.last_health_check
              ? `Última verificação: ${format(new Date(instance.last_health_check), "dd/MM/yyyy HH:mm")}`
              : "Nunca verificado"}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onCheck}
          disabled={checking || !instance.health_check_url}
        >
          <RefreshCw className={`mr-2 h-3 w-3 ${checking ? "animate-spin" : ""}`} />
          Verificar Agora
        </Button>
      </div>
    </div>
  );
}
