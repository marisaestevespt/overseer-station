import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Eye, ExternalLink, Server, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { useInstances } from "@/hooks/queries/useInstances";
import { TableSkeleton } from "@/components/TableSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { DataPagination } from "@/components/DataPagination";

const PAGE_SIZE = 20;

export default function Instances() {
  const navigate = useNavigate();
  const { data: instances = [], isLoading } = useInstances();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const hasFilters = search !== "" || statusFilter !== "all" || healthFilter !== "all";

  const filtered = useMemo(() => {
    return instances.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (healthFilter !== "all" && i.health_status !== healthFilter) return false;
      if (search && !i.business_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [instances, statusFilter, healthFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight">Instâncias</h1>
          <p className="text-muted-foreground text-sm">Lista completa de instâncias geridas.</p>
        </div>
        <Button onClick={() => navigate("/instances/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Nova instância
        </Button>
      </div>

      <div className="hq-card p-4">
        <div className="flex flex-wrap gap-3 mb-4">
          <Input
            placeholder="Pesquisar por nome..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-64"
          />
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="setup">Setup</SelectItem>
              <SelectItem value="suspended">Suspenso</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={healthFilter} onValueChange={(v) => { setHealthFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Health" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os health</SelectItem>
              <SelectItem value="ok">OK</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
              <SelectItem value="unknown">Desconhecido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} columns={7} />
        ) : filtered.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={<SearchX />}
              title="Nenhum resultado"
              description="Nenhuma instância corresponde aos filtros escolhidos."
            />
          ) : (
            <EmptyState
              icon={<Server />}
              title="Ainda não tens instâncias"
              description="Cria a tua primeira instância para começares a gerir clientes."
              actionLabel="Criar primeira instância"
              onAction={() => navigate("/instances/new")}
            />
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business name</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Health</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((inst) => (
                    <TableRow
                      key={inst.id}
                      className="cursor-pointer hover:bg-accent/10"
                      onClick={() => navigate(`/instances/${inst.id}`)}
                    >
                      <TableCell className="font-medium">{inst.business_name}</TableCell>
                      <TableCell>{inst.owner_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inst.owner_email}</TableCell>
                      <TableCell><StatusBadge status={inst.status} /></TableCell>
                      <TableCell><StatusBadge status={inst.health_status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(inst.created_at), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/instances/${inst.id}`)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            Ver detalhes
                          </Button>
                          {inst.instance_url && (
                            <Button size="icon" variant="ghost" asChild>
                              <a href={inst.instance_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DataPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
