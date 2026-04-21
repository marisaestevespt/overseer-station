import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/TableSkeleton";
import { DataPagination } from "@/components/DataPagination";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type ActivityRow = Database["public"]["Tables"]["activity_log"]["Row"];

const PAGE_SIZE = 10;

interface Props {
  activities: ActivityRow[];
  loading: boolean;
}

export function InstanceActivityCard({ activities, loading }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(activities.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => activities.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [activities, currentPage],
  );

  return (
    <div className="glass-card p-5">
      <h2 className="text-lg font-semibold mb-3 font-heading">Histórico de Actividade</h2>
      {loading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem actividade registada</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Acção</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>Por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(a.created_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-sm">{a.action}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.details || "—"}</TableCell>
                  <TableCell className="text-xs">{a.performed_by}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DataPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
