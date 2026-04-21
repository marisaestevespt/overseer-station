import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useSubscriptions } from "@/hooks/queries/useSubscriptions";

export default function Subscriptions() {
  const { data: subs = [] } = useSubscriptions();

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
                <TableCell className="font-medium">{s.instances?.business_name || "—"}</TableCell>
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
