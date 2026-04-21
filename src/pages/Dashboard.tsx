import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Server, Settings, AlertTriangle, DollarSign, Clock, Plus, ExternalLink, Eye, TrendingUp, TrendingDown, Users, BarChart3 } from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import type { Database } from "@/integrations/supabase/types";

type Instance = Database["public"]["Tables"]["instances"]["Row"];
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

interface InstanceWithSub extends Instance {
  subscription?: Subscription | null;
}

const SECTOR_COLORS = [
  "hsl(12, 76%, 52%)",   // primary coral
  "hsl(32, 95%, 52%)",   // accent amber
  "hsl(152, 60%, 42%)",  // success green
  "hsl(210, 78%, 56%)",  // info blue
  "hsl(280, 60%, 55%)",  // purple
  "hsl(340, 65%, 55%)",  // pink
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [instances, setInstances] = useState<InstanceWithSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const { data: inst, error: instError } = await supabase
        .from("instances")
        .select("*")
        .order("created_at", { ascending: false });
      if (instError) {
        toast({ title: "Erro ao carregar dashboard", description: instError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      const { data: subs, error: subsError } = await supabase.from("subscriptions").select("*");
      if (subsError) {
        toast({ title: "Erro ao carregar dashboard", description: subsError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      const merged = (inst || []).map((i) => ({
        ...i,
        subscription: (subs || []).find((s) => s.instance_id === i.id) || null,
      }));
      setInstances(merged);
    } catch (err) {
      toast({
        title: "Erro ao carregar dashboard",
        description: err instanceof Error ? err.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const filtered = instances.filter((i) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (healthFilter !== "all" && i.health_status !== healthFilter) return false;
    if (search && !i.business_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Basic KPIs
  const activeCount = instances.filter((i) => i.status === "active").length;
  const setupCount = instances.filter((i) => i.status === "setup").length;
  const errorCount = instances.filter((i) => i.health_status === "error").length;
  const mrr = instances.reduce((sum, i) => {
    if (i.subscription?.status === "active") return sum + Number(i.subscription.monthly_amount || 0);
    return sum;
  }, 0);
  const pastDueCount = instances.filter((i) => i.subscription?.status === "past_due").length;

  // Advanced metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const ninetyDaysAgo = subDays(now, 90);

    // Churn rate (30d)
    const cancelledLast30 = instances.filter(
      (i) => i.subscription?.status === "cancelled" && i.subscription.created_at && new Date(i.subscription.created_at) >= thirtyDaysAgo
    ).length;
    const totalWithSubs = instances.filter((i) => i.subscription).length;
    const churnRate30 = totalWithSubs > 0 ? ((cancelledLast30 / totalWithSubs) * 100) : 0;

    // Churn rate (90d)
    const cancelledLast90 = instances.filter(
      (i) => i.subscription?.status === "cancelled" && i.subscription.created_at && new Date(i.subscription.created_at) >= ninetyDaysAgo
    ).length;
    const churnRate90 = totalWithSubs > 0 ? ((cancelledLast90 / totalWithSubs) * 100) : 0;

    // ARPU
    const activeWithSubs = instances.filter((i) => i.subscription?.status === "active");
    const arpu = activeWithSubs.length > 0
      ? activeWithSubs.reduce((sum, i) => sum + Number(i.subscription!.monthly_amount || 0), 0) / activeWithSubs.length
      : 0;

    // Growth rate (new instances this month vs last month)
    const thisMonth = instances.filter((i) => {
      const d = new Date(i.created_at);
      return d >= startOfMonth(now) && d <= endOfMonth(now);
    }).length;
    const lastMonth = instances.filter((i) => {
      const lm = subMonths(now, 1);
      const d = new Date(i.created_at);
      return d >= startOfMonth(lm) && d <= endOfMonth(lm);
    }).length;
    const growthRate = lastMonth > 0 ? (((thisMonth - lastMonth) / lastMonth) * 100) : (thisMonth > 0 ? 100 : 0);

    // MRR over last 12 months
    const mrrHistory: { month: string; mrr: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthEnd = endOfMonth(monthDate);
      const monthMrr = instances.reduce((sum, inst) => {
        const sub = inst.subscription;
        if (!sub) return sum;
        const subCreated = new Date(sub.created_at);
        if (subCreated > monthEnd) return sum;
        if (sub.status === "cancelled" && sub.current_period_end && new Date(sub.current_period_end) < startOfMonth(monthDate)) return sum;
        if (sub.status === "active" || sub.status === "past_due" || sub.status === "trialing") {
          return sum + Number(sub.monthly_amount || 0);
        }
        return sum;
      }, 0);
      mrrHistory.push({ month: format(monthDate, "MMM yy"), mrr: monthMrr });
    }

    // Health overview
    const healthOk = instances.filter((i) => i.health_status === "ok").length;
    const healthError = instances.filter((i) => i.health_status === "error").length;
    const healthUnknown = instances.filter((i) => i.health_status === "unknown").length;

    // Sector distribution
    const sectorMap: Record<string, number> = {};
    instances.forEach((i) => {
      const sector = (i as any).sector || "Sem setor";
      sectorMap[sector] = (sectorMap[sector] || 0) + 1;
    });
    const sectorData = Object.entries(sectorMap).map(([name, value]) => ({ name, value }));

    return { churnRate30, churnRate90, arpu, growthRate, mrrHistory, healthOk, healthError, healthUnknown, sectorData };
  }, [instances]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">A carregar...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-heading tracking-tight">Dashboard</h1>
        <Button onClick={() => navigate("/instances/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Instância
        </Button>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard title="Instâncias Activas" value={activeCount} icon={Server} accent="success" />
        <KPICard title="Em Setup" value={setupCount} icon={Settings} />
        <KPICard title="Com Problemas" value={errorCount} icon={AlertTriangle} accent="destructive" />
        <KPICard title="MRR Total" value={`€${mrr.toFixed(2)}`} icon={DollarSign} accent="success" />
        <KPICard title="Pagamento em Atraso" value={pastDueCount} icon={Clock} accent="warning" />
      </div>

      {/* Advanced KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Churn Rate (30d)" value={`${metrics.churnRate30.toFixed(1)}%`} icon={TrendingDown} accent={metrics.churnRate30 > 5 ? "destructive" : "success"} />
        <KPICard title="Churn Rate (90d)" value={`${metrics.churnRate90.toFixed(1)}%`} icon={TrendingDown} accent={metrics.churnRate90 > 10 ? "destructive" : "success"} />
        <KPICard title="ARPU" value={`€${metrics.arpu.toFixed(2)}`} icon={Users} />
        <KPICard title="Crescimento Mensal" value={`${metrics.growthRate > 0 ? "+" : ""}${metrics.growthRate.toFixed(1)}%`} icon={TrendingUp} accent={metrics.growthRate >= 0 ? "success" : "destructive"} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* MRR Chart */}
        <div className="lg:col-span-2 hq-card p-5">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">MRR — Últimos 12 meses</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={metrics.mrrHistory}>
              <defs>
                <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(12, 76%, 52%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(12, 76%, 52%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(25, 15%, 89%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(20, 10%, 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(20, 10%, 46%)" tickFormatter={(v) => `€${v}`} />
              <Tooltip formatter={(value: number) => [`€${value.toFixed(2)}`, "MRR"]} contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(25, 15%, 89%)", boxShadow: "var(--shadow-card)" }} />
              <Area type="monotone" dataKey="mrr" stroke="hsl(12, 76%, 52%)" fill="url(#mrrGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Right column: Health + Sector */}
        <div className="space-y-4">
          {/* Health Overview */}
          <div className="hq-card p-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Health Status</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">OK</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-success" style={{ width: `${instances.length ? (metrics.healthOk / instances.length) * 100 : 0}px`, minWidth: 4 }} />
                  <span className="text-sm font-semibold text-success">{metrics.healthOk}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Erro</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-destructive" style={{ width: `${instances.length ? (metrics.healthError / instances.length) * 100 : 0}px`, minWidth: 4 }} />
                  <span className="text-sm font-semibold text-destructive">{metrics.healthError}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Desconhecido</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded-full bg-muted-foreground" style={{ width: `${instances.length ? (metrics.healthUnknown / instances.length) * 100 : 0}px`, minWidth: 4 }} />
                  <span className="text-sm font-semibold text-muted-foreground">{metrics.healthUnknown}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sector Distribution */}
          <div className="hq-card p-5">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Instâncias por Setor</h3>
            {metrics.sectorData.length > 0 ? (
              <div className="space-y-1.5">
                {metrics.sectorData.map((s, idx) => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }} />
                      <span className="truncate max-w-[140px]">{s.name}</span>
                    </div>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sem dados</p>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="hq-card p-4">
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
                <TableHead>Setor</TableHead>
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
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    Nenhuma instância encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((inst) => (
                  <TableRow key={inst.id} className="cursor-pointer hover:bg-accent/10" onClick={() => navigate(`/instances/${inst.id}`)}>
                    <TableCell className="font-medium">{inst.business_name}</TableCell>
                    <TableCell>{inst.owner_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{(inst as any).sector || "—"}</TableCell>
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
