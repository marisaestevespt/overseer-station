import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ExternalLink, Copy, RefreshCw, Check, Pencil, CreditCard, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Instance = Database["public"]["Tables"]["instances"]["Row"];
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];

export default function InstanceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [instance, setInstance] = useState<Instance | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creatingSubscription, setCreatingSubscription] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const { data: inst, error: instError } = await supabase
        .from("instances").select("*").eq("id", id!).single();
      if (instError) {
        toast({ title: "Erro ao carregar instância", description: instError.message, variant: "destructive" });
        return;
      }

      const { data: sub, error: subError } = await supabase
        .from("subscriptions").select("*").eq("instance_id", id!).maybeSingle();
      if (subError) {
        toast({ title: "Erro ao carregar subscrição", description: subError.message, variant: "destructive" });
        return;
      }

      const { data: logs, error: logsError } = await supabase
        .from("activity_log").select("*").eq("instance_id", id!).order("created_at", { ascending: false });
      if (logsError) {
        toast({ title: "Erro ao carregar histórico", description: logsError.message, variant: "destructive" });
        return;
      }

      if (inst) setInstance(inst);
      if (sub) setSubscription(sub);
      setActivities(logs || []);
    } catch (err) {
      toast({
        title: "Erro ao carregar instância",
        description: err instanceof Error ? err.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  }

  async function saveField(field: string) {
    if (!instance) return;
    const value = editValues[field];
    const { error } = await supabase.from("instances").update({ [field]: value } as Partial<Instance>).eq("id", instance.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setInstance({ ...instance, [field]: value });
      await supabase.from("activity_log").insert({
        instance_id: instance.id,
        action: `Campo "${field}" actualizado`,
        details: `Novo valor: ${value}`,
        performed_by: "admin",
      });
      toast({ title: "Guardado" });
    }
    setEditing({ ...editing, [field]: false });
  }

  async function updateStatus(status: Database["public"]["Enums"]["instance_status"]) {
    if (!instance) return;
    await supabase.from("instances").update({ status }).eq("id", instance.id);
    await supabase.from("activity_log").insert({
      instance_id: instance.id,
      action: `Status alterado para ${status}`,
      performed_by: "admin",
    });
    setInstance({ ...instance, status });
    toast({ title: `Status alterado para ${status}` });
    fetchData();
  }

  async function checkHealth() {
    if (!instance?.health_check_url) return;
    setCheckingHealth(true);
    try {
      const res = await fetch(instance.health_check_url, { signal: AbortSignal.timeout(10000) });
      const healthOk = res.ok;
      const newStatus = healthOk ? "ok" as const : "error" as const;
      const now = new Date().toISOString();
      await supabase.from("instances").update({ health_status: newStatus, last_health_check: now }).eq("id", instance.id);
      await supabase.from("activity_log").insert({
        instance_id: instance.id,
        action: `Health check manual: ${newStatus}`,
        details: `HTTP ${res.status}`,
        performed_by: "admin",
      });
      setInstance({ ...instance, health_status: newStatus, last_health_check: now });
      toast({ title: `Health check: ${newStatus}` });
    } catch {
      const now = new Date().toISOString();
      await supabase.from("instances").update({ health_status: "error", last_health_check: now }).eq("id", instance.id);
      setInstance({ ...instance, health_status: "error", last_health_check: now });
      toast({ title: "Health check falhou", variant: "destructive" });
    }
    setCheckingHealth(false);
  }

  async function createStripeSubscription() {
    if (!instance) return;
    setCreatingSubscription(true);
    try {
      // Get billing_start_date from subscription if it exists
      const billingStartDate = (subscription as any)?.billing_start_date || null;
      const { data, error } = await supabase.functions.invoke("create-stripe-subscription", {
        body: { instanceId: instance.id, billingStartDate },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Subscrição criada com sucesso",
        description: data?.setupUrl ? "Link de setup SEPA enviado por email." : "Subscrição activada.",
      });

      if (data?.setupUrl) {
        window.open(data.setupUrl, "_blank");
      }

      fetchData();
    } catch (err) {
      toast({ title: "Erro ao criar subscrição", description: String(err), variant: "destructive" });
    }
    setCreatingSubscription(false);
  }

  async function cancelStripeSubscription() {
    if (!instance || !subscription?.stripe_subscription_id) return;
    if (!confirm("Tens a certeza que queres cancelar esta subscrição? Esta acção não pode ser revertida.")) return;

    setCancellingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-stripe-subscription", {
        body: { instanceId: instance.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Subscrição cancelada" });
      fetchData();
    } catch (err) {
      toast({ title: "Erro ao cancelar", description: String(err), variant: "destructive" });
    }
    setCancellingSubscription(false);
  }

  function copyUrl() {
    if (instance?.instance_url) {
      navigator.clipboard.writeText(instance.instance_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function startEdit(field: string, currentValue: string) {
    setEditing({ ...editing, [field]: true });
    setEditValues({ ...editValues, [field]: currentValue || "" });
  }

  if (!instance) return <div className="flex items-center justify-center h-64 text-muted-foreground">A carregar...</div>;

  const editableField = (label: string, field: keyof Instance) => (
    <div className="flex items-center justify-between py-2 border-b border-border/50">
      <span className="text-sm text-muted-foreground w-40">{label}</span>
      {editing[field] ? (
        <div className="flex-1 flex gap-2 ml-4">
          {field === "notes" ? (
            <Textarea value={editValues[field]} onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })} rows={2} className="flex-1" />
          ) : (
            <Input value={editValues[field]} onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })} className="flex-1" />
          )}
          <Button size="sm" onClick={() => saveField(field)}>
            <Check className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1 ml-4">
          <span className="text-sm">{(instance[field] as string) || "—"}</span>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(field, (instance[field] as string) || "")}>
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );

  const stripeCustomerUrl = subscription?.stripe_customer_id
    ? `https://dashboard.stripe.com/customers/${subscription.stripe_customer_id}`
    : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold font-heading">{instance.business_name}</h1>
        <StatusBadge status={instance.status} />
      </div>

      {/* General Info */}
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold mb-3 font-heading">Informação Geral</h2>
        {editableField("Nome do negócio", "business_name")}
        {editableField("Owner", "owner_name")}
        {editableField("Email", "owner_email")}
        {editableField("URL da instância", "instance_url")}
        {editableField("Notas", "notes")}

        <div className="flex gap-2 mt-4">
          {instance.instance_url && (
            <>
              <Button variant="outline" size="sm" onClick={copyUrl}>
                {copied ? <Check className="mr-2 h-3 w-3" /> : <Copy className="mr-2 h-3 w-3" />}
                {copied ? "Copiado" : "Copiar URL"}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={instance.instance_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-3 w-3" />
                  Abrir instância
                </a>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stripe Subscription */}
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold mb-3 font-heading">Subscrição Stripe</h2>
        {subscription ? (
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge status={subscription.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor mensal</span>
              <span className="text-sm">€{Number(subscription.monthly_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Próxima renovação</span>
              <span className="text-sm">{subscription.current_period_end ? format(new Date(subscription.current_period_end), "dd/MM/yyyy") : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Plano</span>
              <span className="text-sm">{subscription.plan}</span>
            </div>
            {(subscription as any).billing_start_date && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cobrança começa em</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{format(new Date((subscription as any).billing_start_date), "dd/MM/yyyy")}</span>
                  {/* Allow editing only if no stripe_subscription_id yet (not yet billed) */}
                  {!subscription.stripe_subscription_id && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={new Date((subscription as any).billing_start_date)}
                          onSelect={async (date) => {
                            if (!date) return;
                            await supabase.from("subscriptions").update({
                              billing_start_date: date.toISOString(),
                            } as any).eq("id", subscription.id);
                            toast({ title: "Data de cobrança actualizada" });
                            fetchData();
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            )}
            {subscription.stripe_subscription_id && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Stripe ID</span>
                <span className="text-sm font-mono text-xs">{subscription.stripe_subscription_id}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem subscrição associada</p>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          {!subscription || (subscription.status as string) === "cancelled" ? (
            <Button size="sm" onClick={createStripeSubscription} disabled={creatingSubscription}>
              <CreditCard className="mr-2 h-3 w-3" />
              {creatingSubscription ? "A criar..." : "Criar Subscrição Stripe"}
            </Button>
          ) : (
            <>
              <Button size="sm" variant="destructive" onClick={cancelStripeSubscription} disabled={cancellingSubscription}>
                <X className="mr-2 h-3 w-3" />
                {cancellingSubscription ? "A cancelar..." : "Cancelar Subscrição"}
              </Button>
              {stripeCustomerUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={stripeCustomerUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Ver no Stripe
                  </a>
                </Button>
              )}
            </>
          )}
        </div>

        {/* Status actions */}
        <div className="flex gap-2 mt-4 border-t border-border/50 pt-4">
          {instance.status === "active" && (
            <Button variant="outline" size="sm" onClick={() => updateStatus("suspended")}>Suspender</Button>
          )}
          {instance.status === "suspended" && (
            <Button size="sm" onClick={() => updateStatus("active")}>Reactivar</Button>
          )}
          {instance.status === "setup" && (
            <Button size="sm" onClick={() => updateStatus("active")}>Activar</Button>
          )}
        </div>
      </div>

      {/* Health Check */}
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold mb-3 font-heading">Health Check</h2>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Último resultado:</span>
              <StatusBadge status={instance.health_status} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {instance.last_health_check ? `Última verificação: ${format(new Date(instance.last_health_check), "dd/MM/yyyy HH:mm")}` : "Nunca verificado"}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={checkHealth} disabled={checkingHealth || !instance.health_check_url}>
            <RefreshCw className={`mr-2 h-3 w-3 ${checkingHealth ? "animate-spin" : ""}`} />
            Verificar Agora
          </Button>
        </div>
      </div>

      {/* Activity Log */}
      <div className="glass-card p-5">
        <h2 className="text-lg font-semibold mb-3 font-heading">Histórico de Actividade</h2>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem actividade registada</p>
        ) : (
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
              {activities.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(a.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell className="text-sm">{a.action}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.details || "—"}</TableCell>
                  <TableCell className="text-xs">{a.performed_by}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
