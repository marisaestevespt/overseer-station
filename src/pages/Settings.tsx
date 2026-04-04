import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { templatePreviews } from "@/lib/emailTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Eye, X, Lock, CreditCard, Webhook, GitBranch, Plus, Trash2, Save } from "lucide-react";

interface Plan {
  name: string;
  price: number;
  features: string[];
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Settings state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [savingPlans, setSavingPlans] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [savingGithub, setSavingGithub] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    const { data } = await supabase
      .from("admin_settings" as any)
      .select("key, value");
    if (data) {
      for (const row of data as any[]) {
        if (row.key === "subscription_plans") setPlans(row.value as Plan[]);
        if (row.key === "webhook_url") setWebhookUrl(row.value as string);
        if (row.key === "github_token") setGithubToken(row.value as string);
      }
    }
    setLoadingSettings(false);
  }

  async function saveSetting(key: string, value: any) {
    const { error } = await supabase
      .from("admin_settings" as any)
      .update({ value, updated_at: new Date().toISOString() } as any)
      .eq("key", key);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Guardado", description: "Configuração atualizada com sucesso." });
    return true;
  }

  const handleSavePlans = async () => {
    setSavingPlans(true);
    await saveSetting("subscription_plans", plans);
    setSavingPlans(false);
  };

  const handleSaveWebhook = async () => {
    setSavingWebhook(true);
    await saveSetting("webhook_url", webhookUrl);
    setSavingWebhook(false);
  };

  const handleSaveGithub = async () => {
    setSavingGithub(true);
    await saveSetting("github_token", githubToken);
    setSavingGithub(false);
  };

  const addPlan = () => {
    setPlans([...plans, { name: "", price: 0, features: [] }]);
  };

  const removePlan = (index: number) => {
    setPlans(plans.filter((_, i) => i !== index));
  };

  const updatePlan = (index: number, field: keyof Plan, value: any) => {
    setPlans(plans.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

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

  const activePreview = templatePreviews.find((t) => t.id === previewId);

  if (loadingSettings) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">A carregar...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-heading tracking-tight">Definições</h1>

      {/* General info */}
      <div className="hq-card p-6">
        <p className="text-muted-foreground text-sm">
          Configurações do painel de administração. Os secrets (Stripe, Resend, etc.) são geridos no Lovable Cloud.
        </p>
      </div>

      {/* Subscription Plans */}
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
            <Button size="sm" onClick={handleSavePlans} disabled={savingPlans}>
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
                    <Input
                      value={plan.name}
                      onChange={(e) => updatePlan(idx, "name", e.target.value)}
                      placeholder="Ex: Basic"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Preço mensal (€)</Label>
                    <Input
                      type="number"
                      value={plan.price}
                      onChange={(e) => updatePlan(idx, "price", parseFloat(e.target.value) || 0)}
                    />
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

      {/* Webhook URL */}
      <div className="hq-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Webhook className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold font-heading">Stripe Webhook URL</h2>
        </div>
        <div className="flex gap-3 max-w-lg">
          <Input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1"
          />
          <Button onClick={handleSaveWebhook} disabled={savingWebhook}>
            <Save className="mr-1 h-3 w-3" /> {savingWebhook ? "..." : "Guardar"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          URL configurado no Stripe Dashboard para receber eventos de pagamento. O webhook secret é gerido nos secrets do projeto.
        </p>
      </div>

      {/* GitHub Token */}
      <div className="hq-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold font-heading">GitHub Token</h2>
        </div>
        <div className="flex gap-3 max-w-lg">
          <Input
            type="password"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            placeholder="ghp_..."
            className="flex-1"
          />
          <Button onClick={handleSaveGithub} disabled={savingGithub}>
            <Save className="mr-1 h-3 w-3" /> {savingGithub ? "..." : "Guardar"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Token de acesso pessoal do GitHub para automatizar a propagação de atualizações para os repos das instâncias.
        </p>
      </div>

      {/* Change Password */}
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

      {/* Email Templates */}
      <div className="hq-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold font-heading">Templates de Email</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Preview dos templates de email enviados automaticamente pelo sistema.
        </p>

        <div className="grid gap-3">
          {templatePreviews.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold">{template.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewId(previewId === template.id ? null : template.id)}
                className="ml-4 shrink-0"
              >
                <Eye className="mr-2 h-3 w-3" />
                {previewId === template.id ? "Fechar" : "Preview"}
              </Button>
            </div>
          ))}
        </div>

        {activePreview && (
          <div className="mt-6 border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between bg-muted px-4 py-2">
              <span className="text-sm font-medium">Preview: {activePreview.name}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewId(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="bg-white">
              <iframe
                srcDoc={activePreview.html}
                title={`Preview ${activePreview.name}`}
                className="w-full border-0"
                style={{ height: "600px" }}
                sandbox=""
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
