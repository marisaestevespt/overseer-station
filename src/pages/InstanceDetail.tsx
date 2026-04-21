import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { describeEdgeFunctionError } from "@/lib/edgeFunctionError";
import { useInstance } from "@/hooks/queries/useInstances";
import { useInstanceActivityLog } from "@/hooks/queries/useActivityLog";
import { CardSkeleton } from "@/components/CardSkeleton";
import { TableSkeleton } from "@/components/TableSkeleton";
import { InstanceGeneralCard } from "./instance-detail/InstanceGeneralCard";
import { InstanceSubscriptionCard } from "./instance-detail/InstanceSubscriptionCard";
import { InstanceHealthCard } from "./instance-detail/InstanceHealthCard";
import { InstanceActivityCard } from "./instance-detail/InstanceActivityCard";

type Instance = Database["public"]["Tables"]["instances"]["Row"];
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

export default function InstanceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: instanceData, isLoading: instanceLoading } = useInstance(id);
  const { data: activities = [], isLoading: activitiesLoading } = useInstanceActivityLog(id);

  const instance: Instance | null = instanceData
    ? ({ ...(instanceData as object), subscriptions: undefined } as unknown as Instance)
    : null;
  const subscription: Subscription | null =
    instanceData?.subscriptions && instanceData.subscriptions.length > 0
      ? (instanceData.subscriptions[0] as Subscription)
      : null;

  const [checkingHealth, setCheckingHealth] = useState(false);
  const [creatingSubscription, setCreatingSubscription] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ["instance", id] });
    queryClient.invalidateQueries({ queryKey: ["instances"] });
    queryClient.invalidateQueries({ queryKey: ["activity_log"] });
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
  };

  async function handleSaveField(field: keyof Instance, value: string) {
    if (!instance) return;
    const { error } = await supabase
      .from("instances")
      .update({ [field]: value } as Partial<Instance>)
      .eq("id", instance.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.setQueryData(["instance", id], (old: unknown) =>
      old ? { ...(old as object), [field]: value } : old,
    );
    supabase
      .from("activity_log")
      .insert({
        instance_id: instance.id,
        action: `Campo "${String(field)}" actualizado`,
        details: `Novo valor: ${value}`,
        performed_by: "admin",
      })
      .then(() => queryClient.invalidateQueries({ queryKey: ["activity_log"] }));
    toast({ title: "Guardado" });
  }

  async function updateStatus(status: Database["public"]["Enums"]["instance_status"]) {
    if (!instance) return;
    await supabase.from("instances").update({ status }).eq("id", instance.id);
    await supabase.from("activity_log").insert({
      instance_id: instance.id,
      action: `Status alterado para ${status}`,
      performed_by: "admin",
    });
    toast({ title: `Status alterado para ${status}` });
    refetchAll();
  }

  async function checkHealth() {
    if (!instance?.health_check_url) return;
    setCheckingHealth(true);
    try {
      const res = await fetch(instance.health_check_url, { signal: AbortSignal.timeout(10000) });
      const newStatus = res.ok ? ("ok" as const) : ("error" as const);
      const now = new Date().toISOString();
      await supabase
        .from("instances")
        .update({ health_status: newStatus, last_health_check: now })
        .eq("id", instance.id);
      await supabase.from("activity_log").insert({
        instance_id: instance.id,
        action: `Health check manual: ${newStatus}`,
        details: `HTTP ${res.status}`,
        performed_by: "admin",
      });
      toast({ title: `Health check: ${newStatus}` });
      refetchAll();
    } catch {
      const now = new Date().toISOString();
      await supabase
        .from("instances")
        .update({ health_status: "error", last_health_check: now })
        .eq("id", instance.id);
      toast({ title: "Health check falhou", variant: "destructive" });
      refetchAll();
    }
    setCheckingHealth(false);
  }

  async function createStripeSubscription() {
    if (!instance) return;
    setCreatingSubscription(true);
    try {
      const billingStartDate = subscription?.billing_start_date ?? null;
      const { data, error } = await supabase.functions.invoke("create-stripe-subscription", {
        body: { instanceId: instance.id, billingStartDate },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Subscrição criada com sucesso",
        description: data?.setupUrl ? "Link de setup SEPA enviado por email." : "Subscrição activada.",
      });
      if (data?.setupUrl) window.open(data.setupUrl, "_blank");
      refetchAll();
    } catch (err) {
      toast({
        title: "Erro ao criar subscrição",
        description: describeEdgeFunctionError(err, "create-stripe-subscription"),
        variant: "destructive",
      });
    }
    setCreatingSubscription(false);
  }

  async function cancelStripeSubscription() {
    if (!instance || !subscription?.stripe_subscription_id) return;
    setCancellingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-stripe-subscription", {
        body: { instanceId: instance.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Subscrição cancelada" });
      refetchAll();
    } catch (err) {
      toast({
        title: "Erro ao cancelar",
        description: describeEdgeFunctionError(err, "cancel-stripe-subscription"),
        variant: "destructive",
      });
    }
    setCancellingSubscription(false);
  }

  async function updateBillingDate(date: Date) {
    if (!subscription) return;
    await supabase
      .from("subscriptions")
      .update({ billing_start_date: date.toISOString() })
      .eq("id", subscription.id);
    toast({ title: "Data de cobrança actualizada" });
    refetchAll();
  }

  if (instanceLoading || !instance) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <CardSkeleton count={3} />
        <div className="glass-card p-5">
          <TableSkeleton rows={5} columns={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold font-heading">{instance.business_name}</h1>
        <StatusBadge status={instance.status} />
      </div>

      <InstanceGeneralCard instance={instance} onSaveField={handleSaveField} />

      <InstanceSubscriptionCard
        instance={instance}
        subscription={subscription}
        creating={creatingSubscription}
        cancelling={cancellingSubscription}
        onCreate={createStripeSubscription}
        onCancel={cancelStripeSubscription}
        onUpdateStatus={updateStatus}
        onUpdateBillingDate={updateBillingDate}
      />

      <InstanceHealthCard instance={instance} checking={checkingHealth} onCheck={checkHealth} />

      <InstanceActivityCard activities={activities} loading={activitiesLoading} />
    </div>
  );
}
