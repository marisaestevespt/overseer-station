import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Activity } from "lucide-react";
import { useActivityLog } from "@/hooks/queries/useActivityLog";
import { TableSkeleton } from "@/components/TableSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { DataPagination } from "@/components/DataPagination";

const PAGE_SIZE = 20;

export default function ActivityLogPage() {
  const navigate = useNavigate();
  const { data: logs = [], isLoading } = useActivityLog(200);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => logs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [logs, currentPage],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Log de Actividade</h1>
      <div className="glass-card p-4">
        {isLoading ? (
          <TableSkeleton rows={10} columns={5} />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<Activity />}
            title="Sem atividade registada"
            description="Ainda não existem registos no log de atividade."
          />
        ) : (
          <>
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
                {paginated.map((log) => (
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
            <DataPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
