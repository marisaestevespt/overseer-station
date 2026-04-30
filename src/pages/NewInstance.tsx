import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ROOT_DOMAIN,
  buildHealthCheckUrl,
  buildInstanceUrl,
  isValidSubdomain,
  slugifySubdomain,
} from "@/lib/subdomain";

const SECTORS = [
  "Serviços Digitais",
  "Saúde & Bem-estar",
  "Educação & Formação",
  "Criativo & Produção",
  "Consultoria & Jurídico",
  "Oficina & Automóvel",
] as const;

export default function NewInstance() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [billingStartDate, setBillingStartDate] = useState<Date | undefined>();
  const [subdomain, setSubdomain] = useState("");
  const [subdomainTouched, setSubdomainTouched] = useState(false);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);
  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    owner_email: "",
    monthly_amount: "",
    notes: "",
    sector: "",
    stats_url: "",
    stats_key: "",
  });

  const handleBusinessNameChange = (value: string) => {
    setForm((f) => ({ ...f, business_name: value }));
    if (!subdomainTouched) {
      setSubdomain(slugifySubdomain(value));
      setSubdomainError(null);
    }
  };

  const handleSubdomainChange = (value: string) => {
    setSubdomainTouched(true);
    setSubdomain(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    setSubdomainError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate subdomain
    if (!subdomain) {
      setSubdomainError("Subdomínio obrigatório.");
      return;
    }
    if (!isValidSubdomain(subdomain)) {
      setSubdomainError("Apenas letras minúsculas, números e hífens (1-32 caracteres, sem hífen no início/fim).");
      return;
    }

    setLoading(true);

    // Check uniqueness
    const { data: existing, error: checkError } = await supabase
      .from("instances")
      .select("id")
      .eq("subdomain", subdomain)
      .maybeSingle();
    if (checkError) {
      toast({ title: "Erro ao validar subdomínio", description: checkError.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    if (existing) {
      setSubdomainError("Este subdomínio já está em uso.");
      setLoading(false);
      return;
    }

    const instanceUrl = buildInstanceUrl(subdomain);
    const healthCheckUrl = buildHealthCheckUrl(subdomain);

    let instance: any = null;
    try {
      const { data, error } = await supabase
        .from("instances")
        .insert({
          business_name: form.business_name,
          owner_name: form.owner_name,
          owner_email: form.owner_email,
          subdomain,
          instance_url: instanceUrl,
          health_check_url: healthCheckUrl,
          notes: form.notes || null,
          status: "setup",
          sector: form.sector || null,
          stats_url: form.stats_url.trim() || null,
          stats_key: form.stats_key.trim() || null,
        } as any)
        .select()
        .single();

      if (error || !data) {
        toast({ title: "Erro ao criar instância", description: error?.message || "Não foi possível criar.", variant: "destructive" });
        setLoading(false);
        return;
      }
      instance = data;

      // Create subscription
      if (form.monthly_amount) {
        const { error: subError } = await supabase.from("subscriptions").insert({
          instance_id: instance.id,
          monthly_amount: parseFloat(form.monthly_amount),
          status: "active",
          billing_start_date: billingStartDate ? billingStartDate.toISOString() : null,
        } as any);
        if (subError) {
          toast({ title: "Erro ao criar subscrição", description: subError.message, variant: "destructive" });
        }
      }

      // Log activity
      const { error: logError } = await supabase.from("activity_log").insert({
        instance_id: instance.id,
        action: "Instância criada",
        details: `Negócio: ${form.business_name}, Owner: ${form.owner_name}, Subdomínio: ${subdomain}.${ROOT_DOMAIN}, Setor: ${form.sector || "N/A"}${billingStartDate ? `, Cobrança a partir de: ${format(billingStartDate, "dd/MM/yyyy")}` : ""}`,
        performed_by: "admin",
      });
      if (logError) {
        toast({ title: "Aviso", description: `Não foi possível registar no log: ${logError.message}`, variant: "destructive" });
      }
    } catch (err) {
      toast({
        title: "Erro ao criar instância",
        description: err instanceof Error ? err.message : "Erro inesperado.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Send welcome email if subscription is active
    if (form.monthly_amount) {
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            template: "welcome",
            instanceId: instance.id,
            extraData: { instanceUrl },
          },
        });
        toast({ title: "Email enviado", description: `Email de boas-vindas enviado para ${form.owner_email}.` });
      } catch {
        toast({ title: "Aviso", description: "Instância criada mas não foi possível enviar o email de boas-vindas.", variant: "destructive" });
      }
    }

    toast({ title: "Instância criada", description: `${form.business_name} foi registada com sucesso.` });
    queryClient.invalidateQueries({ queryKey: ["instances"] });
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["activity_log"] });
    navigate(`/instances/${instance.id}`);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Nova Instância</h1>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do negócio *</Label>
            <Input value={form.business_name} onChange={(e) => handleBusinessNameChange(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Nome do owner *</Label>
            <Input value={form.owner_name} onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))} required />
          </div>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Email do owner *</Label>
            <Input type="email" value={form.owner_email} onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label>Setor de atividade</Label>
            <Select value={form.sector} onValueChange={(v) => setForm((f) => ({ ...f, sector: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar setor..." />
              </SelectTrigger>
              <SelectContent>
                {SECTORS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Subdomínio *</Label>
          <div className="flex items-stretch">
            <Input
              value={subdomain}
              onChange={(e) => handleSubdomainChange(e.target.value)}
              placeholder="exemplo"
              className="rounded-r-none"
              required
            />
            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-sm text-muted-foreground whitespace-nowrap">
              .{ROOT_DOMAIN}
            </span>
          </div>
          {subdomainError ? (
            <p className="text-xs text-destructive">{subdomainError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {subdomain ? `URL final: https://${subdomain}.${ROOT_DOMAIN}` : "Apenas letras minúsculas, números e hífens."}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Valor mensal (€)</Label>
            <Input type="number" step="0.01" value={form.monthly_amount} onChange={(e) => setForm((f) => ({ ...f, monthly_amount: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Data de início de cobrança</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !billingStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {billingStartDate ? format(billingStartDate, "dd/MM/yyyy") : "Cobrança imediata"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={billingStartDate}
                  onSelect={setBillingStartDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">Se em branco, a cobrança começa imediatamente.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>URL de estatísticas</Label>
          <Input
            value={form.stats_url}
            onChange={(e) => setForm((f) => ({ ...f, stats_url: e.target.value }))}
            placeholder={subdomain ? `https://${subdomain}.lyrata.pt/functions/v1/admin-stats` : "https://.../functions/v1/admin-stats"}
          />
          <p className="text-xs text-muted-foreground">Endpoint da instância que devolve métricas. Opcional na criação.</p>
        </div>

        <div className="space-y-2">
          <Label>Chave de estatísticas</Label>
          <Input
            value={form.stats_key}
            onChange={(e) => setForm((f) => ({ ...f, stats_key: e.target.value }))}
            placeholder="x-admin-key da instância"
          />
        </div>

        <div className="space-y-2">
          <Label>Notas</Label>
          <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" disabled={loading}>
            {loading ? "A criar..." : "Criar Instância"}
          </Button>
        </div>
      </form>
    </div>
  );
}
