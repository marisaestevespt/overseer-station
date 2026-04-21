import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useActivityLog } from "@/hooks/queries/useActivityLog";

export default function ActivityLogPage() {
  const navigate = useNavigate();
  const { data: logs = [] } = useActivityLog(200);

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
                  {log.instances?.business_name || "—"}
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
