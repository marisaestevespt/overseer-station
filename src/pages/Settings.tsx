import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { templatePreviews } from "@/lib/emailTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Eye, X, Lock } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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

    // Verify current password by re-signing in
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-heading">Definições</h1>

      {/* General Settings */}
      <div className="glass-card p-6">
        <p className="text-muted-foreground text-sm">
          Configurações do painel de administração. As variáveis de ambiente (Stripe, Resend, etc.) devem ser configuradas no Lovable Cloud.
        </p>
      </div>

      {/* Email Templates */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold font-heading">Templates de Email</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Preview dos templates de email enviados automaticamente pelo sistema. O envio usa Resend com o remetente <code className="text-xs bg-muted px-1.5 py-0.5 rounded">onboarding@resend.dev</code>.
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

        {/* Email Preview */}
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
