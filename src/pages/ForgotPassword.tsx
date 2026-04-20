import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.functions.invoke("request-password-reset", {
      body: { email: email.trim().toLowerCase(), redirect_to: redirectTo },
    });

    setLoading(false);

    if (error) {
      // Mesmo perante erro de rede, mostra mensagem uniforme
      console.error(error);
    }

    setSent(true);
    toast({
      title: "Pedido recebido",
      description: "Se o email existir, vais receber instruções em breve.",
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold font-heading text-primary">Recuperar password</h1>
          <p className="text-sm text-muted-foreground">
            Mete o teu email e enviamos-te um link para definires uma nova password.
          </p>
        </div>

        {sent ? (
          <div className="glass-card p-6 space-y-4 text-center">
            <Mail className="h-10 w-10 text-primary mx-auto" />
            <p className="text-sm">
              Se existir uma conta associada a <strong>{email}</strong>, vais receber um email com instruções dentro de instantes.
            </p>
            <p className="text-xs text-muted-foreground">
              Verifica também a pasta de spam.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao login
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
                autoComplete="email"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              {loading ? "A enviar..." : "Enviar link"}
            </Button>

            <Button asChild variant="ghost" className="w-full">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao login
              </Link>
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
