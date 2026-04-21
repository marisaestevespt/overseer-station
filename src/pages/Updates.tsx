import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, GitBranch, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface InstanceVersion {
  id: string;
  business_name: string;
  status: string;
  instance_url: string | null;
  health_check_url: string | null;
  github_repo: string | null;
  current_version: string | null;
  last_update_check: string | null;
}

const MASTER_VERSION = "2026-04-04-v1.0";

export default function UpdatesPage() {
  const { toast } = useToast();
  const [instances, setInstances] = useState<InstanceVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);

  useEffect(() => {
    fetchInstances();
  }, []);

  async function fetchInstances() {
    try {
      const { data, error } = await supabase
        .from("instances")
        .select("id, business_name, status, instance_url, health_check_url, github_repo, current_version, last_update_check" as any)
        .order("business_name");
      if (error) {
        toast({ title: "Erro ao carregar atualizações", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      setInstances((data as any) || []);
    } catch (err) {
      toast({
        title: "Erro ao carregar atualizações",
        description: err instanceof Error ? err.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function checkVersion(instance: InstanceVersion) {
    if (!instance.health_check_url) {
      toast({ title: "Erro", description: "Sem URL de health check configurado.", variant: "destructive" });
      return;
    }
    setChecking(instance.id);
    try {
      const res = await fetch(instance.health_check_url);
      const data = await res.json();
      const version = data.version || null;

      await supabase
        .from("instances")
        .update({
          current_version: version,
          last_update_check: new Date().toISOString(),
        } as any)
        .eq("id", instance.id);

      setInstances((prev) =>
        prev.map((i) =>
          i.id === instance.id
            ? { ...i, current_version: version, last_update_check: new Date().toISOString() }
            : i
        )
      );

      toast({ title: "Versão verificada", description: `${instance.business_name}: ${version || "sem versão"}` });
    } catch {
      toast({ title: "Erro", description: `Não foi possível verificar ${instance.business_name}`, variant: "destructive" });
    }
    setChecking(null);
  }

  async function checkAll() {
    setCheckingAll(true);
    for (const inst of instances) {
      if (inst.health_check_url) {
        await checkVersion(inst);
      }
    }
    setCheckingAll(false);
  }

  const outdatedCount = instances.filter(
    (i) => i.current_version && i.current_version !== MASTER_VERSION
  ).length;
  const upToDateCount = instances.filter(
    (i) => i.current_version && i.current_version === MASTER_VERSION
  ).length;
  const unknownCount = instances.filter((i) => !i.current_version).length;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">A carregar...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-heading tracking-tight">Atualizações</h1>
        <Button onClick={checkAll} disabled={checkingAll}>
          <RefreshCw className={`mr-2 h-4 w-4 ${checkingAll ? "animate-spin" : ""}`} />
          {checkingAll ? "A verificar..." : "Verificar Todas"}
        </Button>
      </div>

      {/* Master version info */}
      <div className="hq-card p-5">
        <div className="flex items-center gap-3">
          <GitBranch className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold font-heading">Versão Master (Template)</h2>
            <p className="text-sm text-muted-foreground">
              Versão atual: <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{MASTER_VERSION}</code>
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="hq-card p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div>
            <p className="text-2xl font-bold text-success">{upToDateCount}</p>
            <p className="text-xs text-muted-foreground">Atualizadas</p>
          </div>
        </div>
        <div className="hq-card p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-warning" />
          <div>
            <p className="text-2xl font-bold text-warning">{outdatedCount}</p>
            <p className="text-xs text-muted-foreground">Desatualizadas</p>
          </div>
        </div>
        <div className="hq-card p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold text-muted-foreground">{unknownCount}</p>
            <p className="text-xs text-muted-foreground">Versão desconhecida</p>
          </div>
        </div>
      </div>

      {/* Instances table */}
      <div className="hq-card p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instância</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Versão Atual</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>GitHub Repo</TableHead>
                <TableHead>Última Verificação</TableHead>
                <TableHead>Acções</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma instância encontrada
                  </TableCell>
                </TableRow>
              ) : (
                instances.map((inst) => {
                  const isOutdated = inst.current_version && inst.current_version !== MASTER_VERSION;
                  const isUpToDate = inst.current_version === MASTER_VERSION;
                  return (
                    <TableRow key={inst.id}>
                      <TableCell className="font-medium">{inst.business_name}</TableCell>
                      <TableCell><StatusBadge status={inst.status as any} /></TableCell>
                      <TableCell>
                        {inst.current_version ? (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{inst.current_version}</code>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isUpToDate && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Atualizada
                          </span>
                        )}
                        {isOutdated && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-warning">
                            <AlertCircle className="h-3.5 w-3.5" /> Desatualizada
                          </span>
                        )}
                        {!inst.current_version && (
                          <span className="text-xs text-muted-foreground">Desconhecido</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {inst.github_repo ? (
                          <a href={inst.github_repo} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate max-w-[200px] block">
                            {inst.github_repo.replace("https://github.com/", "")}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inst.last_update_check
                          ? format(new Date(inst.last_update_check), "dd/MM/yyyy HH:mm")
                          : "Nunca"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => checkVersion(inst)}
                          disabled={checking === inst.id || !inst.health_check_url}
                        >
                          <RefreshCw className={`mr-1 h-3 w-3 ${checking === inst.id ? "animate-spin" : ""}`} />
                          Verificar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
