import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
type Instance = Database["public"]["Tables"]["instances"]["Row"];

interface SubWithInstance extends Subscription {
  instances?: Instance | null;
}

export default function Subscriptions() {
  const { toast } = useToast();
  const [subs, setSubs] = useState<SubWithInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("*, instances(*)")
          .order("created_at", { ascending: false });
        if (error) {
          toast({ title: "Erro ao carregar subscrições", description: error.message, variant: "destructive" });
        } else {
          setSubs((data as SubWithInstance[]) || []);
        }
      } catch (err) {
        toast({
          title: "Erro ao carregar subscrições",
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
      <h1 className="text-2xl font-bold">Subscrições</h1>
      <div className="glass-card p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Negócio</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valor/mês</TableHead>
              <TableHead>Próxima Renovação</TableHead>
              <TableHead>Criada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subs.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{(s.instances as Instance)?.business_name || "—"}</TableCell>
                <TableCell>{s.plan}</TableCell>
                <TableCell><StatusBadge status={s.status} /></TableCell>
                <TableCell>€{Number(s.monthly_amount).toFixed(2)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {s.current_period_end ? format(new Date(s.current_period_end), "dd/MM/yyyy") : "—"}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(s.created_at), "dd/MM/yyyy")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
