import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Webhook, GitBranch, Plus, Trash2, Save, Lock, Undo2 } from "lucide-react";
import { useAdminSettings, useSaveAdminSetting, type Plan } from "@/hooks/queries/useAdminSettings";

export function GeneralTab() {
  const { toast } = useToast();
  const { data: adminSettings } = useAdminSettings();
  const saveAdminSetting = useSaveAdminSetting();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  // Snapshot do que está guardado em DB — só é actualizado depois de save bem-sucedido ou no carregamento inicial.
  const [savedPlans, setSavedPlans] = useState<Plan[] | null>(null);
  const [savedWebhook, setSavedWebhook] = useState<string | null>(null);
  const [savedGithub, setSavedGithub] = useState<string | null>(null);

  // Inicializa estado local apenas quando ainda não temos snapshot — evita perder edições
  // quando o React Query refaz fetch (focus, invalidate, etc.).
  useEffect(() => {
    if (!adminSettings) return;
    if (savedPlans === null) {
      setPlans(adminSettings.subscription_plans ?? []);
      setSavedPlans(adminSettings.subscription_plans ?? []);
    }
    if (savedWebhook === null) {
      setWebhookUrl(adminSettings.webhook_url ?? "");
      setSavedWebhook(adminSettings.webhook_url ?? "");
    }
    if (savedGithub === null) {
      setGithubToken(adminSettings.github_token ?? "");
      setSavedGithub(adminSettings.github_token ?? "");
    }
  }, [adminSettings, savedPlans, savedWebhook, savedGithub]);

  const savingPlans = saveAdminSetting.isPending && saveAdminSetting.variables?.key === "subscription_plans";
  const savingWebhook = saveAdminSetting.isPending && saveAdminSetting.variables?.key === "webhook_url";
  const savingGithub = saveAdminSetting.isPending && saveAdminSetting.variables?.key === "github_token";

  const plansDirty = useMemo(
    () => JSON.stringify(plans) !== JSON.stringify(savedPlans ?? []),
    [plans, savedPlans],
  );
  const webhookDirty = webhookUrl !== (savedWebhook ?? "");
  const githubDirty = githubToken !== (savedGithub ?? "");

  const addPlan = () => setPlans([...plans, { name: "", price: 0, features: [] }]);
  const removePlan = (index: number) => setPlans(plans.filter((_, i) => i !== index));
  const updatePlan = (index: number, field: keyof Plan, value: Plan[keyof Plan]) =>
    setPlans(plans.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

  const savePlans = () => {
    // Validação simples: nome e preço numérico válido
    const cleaned = plans.map((p) => ({
      name: (p.name ?? "").trim(),
      price: Number.isFinite(p.price) ? p.price : 0,
      features: (p.features ?? []).map((f) => f.trim()).filter(Boolean),
    }));
    if (cleaned.some((p) => !p.name)) {
      toast({ title: "Erro", description: "Todos os planos precisam de um nome.", variant: "destructive" });
      return;
    }
    saveAdminSetting.mutate(
      { key: "subscription_plans", value: cleaned },
      { onSuccess: () => { setPlans(cleaned); setSavedPlans(cleaned); } },
    );
  };

  const saveWebhook = () => {
    const value = webhookUrl.trim();
    saveAdminSetting.mutate(
      { key: "webhook_url", value },
      { onSuccess: () => { setWebhookUrl(value); setSavedWebhook(value); } },
    );
  };

  const saveGithub = () => {
    const value = githubToken.trim();
    saveAdminSetting.mutate(
      { key: "github_token", value },
      { onSuccess: () => { setGithubToken(value); setSavedGithub(value); } },
    );
  };

  const discardPlans = () => setPlans(savedPlans ?? []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Erro", description: "As passwords não coincidem.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Erro", description: "A password deve ter pelo menos 8 caracteres.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: currentPassword,
    });
    if (signInError) {
      toast({ title: "Erro", description: "Password actual incorrecta.", variant: "destructive" });
      setChangingPassword(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Password alterada com sucesso." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  return (
    <div className="space-y-6">
      <div className="hq-card p-6">
        <p className="text-muted-foreground text-sm">
          Configurações do painel de administração. Os secrets (Stripe, Resend, etc.) são geridos no Lovable Cloud.
        </p>
      </div>

      <div className="hq-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold font-heading">Planos de Subscrição</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addPlan}>
              <Plus className="mr-1 h-3 w-3" /> Adicionar Plano
            </Button>
            <Button size="sm" onClick={() => saveAdminSetting.mutate({ key: "subscription_plans", value: plans })} disabled={savingPlans}>
              <Save className="mr-1 h-3 w-3" /> {savingPlans ? "A guardar..." : "Guardar"}
            </Button>
          </div>
        </div>
        <div className="grid gap-4">
          {plans.map((plan, idx) => (
            <div key={idx} className="p-4 rounded-lg border border-border/50 bg-card/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-2 gap-3 flex-1 mr-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome do plano</Label>
                    <Input value={plan.name} onChange={(e) => updatePlan(idx, "name", e.target.value)} placeholder="Ex: Basic" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Preço mensal (€)</Label>
                    <Input type="number" value={plan.price} onChange={(e) => updatePlan(idx, "price", parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removePlan(idx)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Features (uma por linha)</Label>
                <textarea
                  className="w-full min-h-[80px] text-sm p-2 rounded-md border border-border bg-background resize-y"
                  value={plan.features.join("\n")}
                  onChange={(e) => updatePlan(idx, "features", e.target.value.split("\n").filter(Boolean))}
                  placeholder="Uma feature por linha..."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="hq-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Webhook className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold font-heading">Stripe Webhook URL</h2>
        </div>
        <div className="flex gap-3 max-w-lg">
          <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://..." className="flex-1" />
          <Button onClick={() => saveAdminSetting.mutate({ key: "webhook_url", value: webhookUrl })} disabled={savingWebhook}>
            <Save className="mr-1 h-3 w-3" /> {savingWebhook ? "..." : "Guardar"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          URL configurado no Stripe Dashboard para receber eventos de pagamento.
        </p>
      </div>

      <div className="hq-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold font-heading">GitHub Token</h2>
        </div>
        <div className="flex gap-3 max-w-lg">
          <Input type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="ghp_..." className="flex-1" />
          <Button onClick={() => saveAdminSetting.mutate({ key: "github_token", value: githubToken })} disabled={savingGithub}>
            <Save className="mr-1 h-3 w-3" /> {savingGithub ? "..." : "Guardar"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Token de acesso pessoal do GitHub para automatizar a propagação de atualizações.
        </p>
      </div>

      <div className="hq-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold font-heading">Alterar Password</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="current-password">Password actual</Label>
            <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova password</Label>
            <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova password</Label>
            <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <Button type="submit" disabled={changingPassword}>
            {changingPassword ? "A alterar..." : "Alterar password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
