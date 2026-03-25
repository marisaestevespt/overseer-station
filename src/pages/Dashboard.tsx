import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Server, Settings, AlertTriangle, DollarSign, Clock, Plus, ExternalLink, Eye } from "lucide-react";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type Instance = Database["public"]["Tables"]["instances"]["Row"];
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

interface InstanceWithSub extends Instance {
  subscription?: Subscription | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [instances, setInstances] = useState<InstanceWithSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: inst } = await supabase.from("instances").select("*").order("created_at", { ascending: false });
    const { data: subs } = await supabase.from("subscriptions").select("*");

    const merged = (inst || []).map((i) => ({
      ...i,
      subscription: (subs || []).find((s) => s.instance_id === i.id) || null,
    }));
    setInstances(merged);
    setLoading(false);
  }

  const filtered = instances.filter((i) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (healthFilter !== "all" && i.health_status !== healthFilter) return false;
    if (search && !i.business_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = instances.filter((i) => i.status === "active").length;
  const setupCount = instances.filter((i) => i.status === "setup").length;
  const errorCount = instances.filter((i) => i.health_status === "error").length;
  const mrr = instances.reduce((sum, i) => {
    if (i.subscription?.status === "active") return sum + Number(i.subscription.monthly_amount || 0);
    return sum;
  }, 0);
  const pastDueCount = instances.filter((i) => i.subscription?.status === "past_due").length;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">A carregar...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={() => navigate("/instances/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Instância
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Instâncias Activas" value={activeCount} icon={Server} accent="success" />
        <KPICard title="Em Setup" value={setupCount} icon={Settings} />
        <KPICard title="Com Problemas" value={errorCount} icon={AlertTriangle} accent="destructive" />
        <KPICard title="MRR Total" value={`€${mrr.toFixed(2)}`} icon={DollarSign} accent="success" />
        <KPICard title="Pagamento em Atraso" value={pastDueCount} icon={Clock} accent="warning" />
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-3 mb-4">
          <Input
            placeholder="Pesquisar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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
          <Select value={healthFilter} onValueChange={setHealthFilter}>
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

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Negócio</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscrição</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Última Verificação</TableHead>
                <TableHead>Renovação</TableHead>
                <TableHead>Valor/mês</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead>Acções</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    Nenhuma instância encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((inst) => (
                  <TableRow key={inst.id} className="cursor-pointer hover:bg-accent/30" onClick={() => navigate(`/instances/${inst.id}`)}>
                    <TableCell className="font-medium">{inst.business_name}</TableCell>
                    <TableCell>{inst.owner_name}</TableCell>
                    <TableCell><StatusBadge status={inst.status} /></TableCell>
                    <TableCell>{inst.subscription ? <StatusBadge status={inst.subscription.status} /> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                    <TableCell><StatusBadge status={inst.health_status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inst.last_health_check ? format(new Date(inst.last_health_check), "dd/MM HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {inst.subscription?.current_period_end ? format(new Date(inst.subscription.current_period_end), "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      {inst.subscription ? `€${Number(inst.subscription.monthly_amount).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(inst.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/instances/${inst.id}`)}>
                          <Eye className="h-4 w-4" />
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
