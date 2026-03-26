import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function NewInstance() {
  const navigate = useNavigate();
  const { toast } = useToast();
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

    const { data: instance, error } = await supabase
      .from("instances")
      .insert({
        business_name: form.business_name,
        owner_name: form.owner_name,
        owner_email: form.owner_email,
        instance_url: form.instance_url || null,
        health_check_url: form.health_check_url || null,
        notes: form.notes || null,
        status: "setup",
      })
      .select()
      .single();

    if (error || !instance) {
      toast({ title: "Erro", description: error?.message || "Erro ao criar instância", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Create subscription
    if (form.monthly_amount) {
      await supabase.from("subscriptions").insert({
        instance_id: instance.id,
        monthly_amount: parseFloat(form.monthly_amount),
        status: "active",
        billing_start_date: billingStartDate ? billingStartDate.toISOString() : null,
      } as any);
    }

    // Log activity
    await supabase.from("activity_log").insert({
      instance_id: instance.id,
      action: "Instância criada",
      details: `Negócio: ${form.business_name}, Owner: ${form.owner_name}${billingStartDate ? `, Cobrança a partir de: ${format(billingStartDate, "dd/MM/yyyy")}` : ""}`,
      performed_by: "admin",
    });

    toast({ title: "Instância criada", description: `${form.business_name} foi registada com sucesso.` });
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

        <div className="space-y-2">
          <Label>Email do owner *</Label>
          <Input type="email" value={form.owner_email} onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))} required />
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
