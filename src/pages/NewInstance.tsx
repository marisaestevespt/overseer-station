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
  const [form, setForm] = useState({
    business_name: "",
    owner_name: "",
    owner_email: "",
    instance_url: "",
    health_check_url: "",
    monthly_amount: "",
    notes: "",
    sector: "",
  });

  const handleUrlChange = (url: string) => {
    setForm((f) => ({
      ...f,
      instance_url: url,
      health_check_url: url ? `${url.replace(/\/$/, "")}/functions/v1/health-check` : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let instance: any = null;
    try {
      const { data, error } = await supabase
        .from("instances")
        .insert({
          business_name: form.business_name,
          owner_name: form.owner_name,
          owner_email: form.owner_email,
          instance_url: form.instance_url || null,
          health_check_url: form.health_check_url || null,
          notes: form.notes || null,
          status: "setup",
          sector: form.sector || null,
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
        details: `Negócio: ${form.business_name}, Owner: ${form.owner_name}, Setor: ${form.sector || "N/A"}${billingStartDate ? `, Cobrança a partir de: ${format(billingStartDate, "dd/MM/yyyy")}` : ""}`,
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
    if (form.monthly_amount && form.instance_url) {
      try {
        await supabase.functions.invoke("send-email", {
          body: {
            template: "welcome",
            instanceId: instance.id,
            extraData: { instanceUrl: form.instance_url },
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
            <Input value={form.business_name} onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))} required />
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
          <Label>URL da instância</Label>
          <Input value={form.instance_url} onChange={(e) => handleUrlChange(e.target.value)} placeholder="https://..." />
        </div>

        <div className="space-y-2">
          <Label>Health check URL</Label>
          <Input value={form.health_check_url} onChange={(e) => setForm((f) => ({ ...f, health_check_url: e.target.value }))} placeholder="Preenchido automaticamente" />
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
