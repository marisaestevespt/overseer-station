import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, Eye, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import type { Database } from "@/integrations/supabase/types";

type Instance = Database["public"]["Tables"]["instances"]["Row"];

export default function Instances() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<string>("all");

  useEffect(() => {
    fetchInstances();
  }, []);

  async function fetchInstances() {
    try {
      const { data, error } = await supabase
        .from("instances")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Erro ao carregar instâncias",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      setInstances(data ?? []);
    } catch (err) {
      toast({
        title: "Erro ao carregar instâncias",
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    A carregar...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma instância encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((inst) => (
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
