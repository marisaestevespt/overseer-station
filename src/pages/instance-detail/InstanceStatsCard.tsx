import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { describeEdgeFunctionError } from "@/lib/edgeFunctionError";
import { RefreshCw, Activity, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type Instance = Database["public"]["Tables"]["instances"]["Row"];

interface Props {
  instance: Instance;
}

function isPrimitive(v: unknown): v is string | number | boolean {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

export function InstanceStatsCard({ instance }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const stats = (instance.last_stats as Record<string, unknown> | null) ?? null;
  const fetchedAt = instance.last_stats_at ? new Date(instance.last_stats_at) : null;
  const configured = !!instance.stats_url && !!instance.stats_key;

  async function refresh() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-instance-stats", {
        body: { instance_id: instance.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Erro");
      toast({ title: "Estatísticas atualizadas" });
      queryClient.invalidateQueries({ queryKey: ["instance", instance.id] });
      queryClient.invalidateQueries({ queryKey: ["instances"] });
    } catch (err) {
      toast({
        title: "Falha ao buscar estatísticas",
        description: describeEdgeFunctionError(err, "fetch-instance-stats"),
        variant: "destructive",
      });
    }
    setLoading(false);
  }

  // Flatten primitive top-level keys for display
  const entries = stats
    ? Object.entries(stats).filter(([, v]) => isPrimitive(v))
    : [];

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold font-heading">Métricas Remotas</h2>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={loading || !configured}>
          <RefreshCw className={`mr-2 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Atualizar agora
        </Button>
      </div>

      {!configured && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground p-3 rounded-md bg-muted/50">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Configura URL e chave de estatísticas para começares a recolher métricas.</span>
        </div>
      )}

      {configured && entries.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Sem dados ainda. Clica em "Atualizar agora" para fazer a primeira recolha.
        </p>
      )}

      {entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {entries.map(([k, v]) => (
            <div key={k} className="rounded-md border border-border/50 p-3">
              <p className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, " ")}</p>
              <p className="text-xl font-semibold mt-1">{String(v)}</p>
            </div>
          ))}
        </div>
      )}

      {fetchedAt && (
        <p className="text-xs text-muted-foreground">
          Última atualização: há {formatDistanceToNow(fetchedAt, { locale: pt })}
        </p>
      )}
    </div>
  );
}
