import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { CreditCard } from "lucide-react";
import { useSubscriptions } from "@/hooks/queries/useSubscriptions";
import { TableSkeleton } from "@/components/TableSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { DataPagination } from "@/components/DataPagination";

const PAGE_SIZE = 20;

export default function Subscriptions() {
  const { data: subs = [], isLoading } = useSubscriptions();
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(subs.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => subs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [subs, currentPage],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Subscrições</h1>
      <div className="glass-card p-4">
        {isLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : subs.length === 0 ? (
          <EmptyState
            icon={<CreditCard />}
            title="Sem subscrições ativas"
            description="As subscrições aparecerão aqui assim que forem criadas."
          />
        ) : (
          <>
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
                {paginated.map((s) => (
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
            <DataPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
