import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];
type Instance = Database["public"]["Tables"]["instances"]["Row"];

interface LogWithInstance extends ActivityLog {
  instances?: Instance | null;
}

export default function ActivityLogPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogWithInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("activity_log")
          .select("*, instances(business_name)")
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) {
          toast({ title: "Erro ao carregar log de atividade", description: error.message, variant: "destructive" });
        } else {
          setLogs((data as LogWithInstance[]) || []);
        }
      } catch (err) {
        toast({
          title: "Erro ao carregar log de atividade",
          description: err instanceof Error ? err.message : "Erro inesperado.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Log de Actividade</h1>
      <div className="glass-card p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Instância</TableHead>
              <TableHead>Acção</TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead>Por</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow
                key={log.id}
                className="cursor-pointer hover:bg-accent/30"
                onClick={() => navigate(`/instances/${log.instance_id}`)}
              >
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                </TableCell>
                <TableCell className="font-medium">
                  {(log.instances as Instance)?.business_name || "—"}
                </TableCell>
                <TableCell className="text-sm">{log.action}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{log.details || "—"}</TableCell>
                <TableCell className="text-xs">{log.performed_by}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
