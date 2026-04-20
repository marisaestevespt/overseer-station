import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Check, X, KeyRound, Loader2 } from "lucide-react";

interface Rule {
  label: string;
  test: (v: string) => boolean;
}

const RULES: Rule[] = [
  { label: "Mínimo 12 caracteres", test: (v) => v.length >= 12 },
  { label: "Pelo menos uma maiúscula", test: (v) => /[A-Z]/.test(v) },
  { label: "Pelo menos uma minúscula", test: (v) => /[a-z]/.test(v) },
  { label: "Pelo menos um dígito", test: (v) => /\d/.test(v) },
  { label: "Pelo menos um símbolo", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [recoveryReady, setRecoveryReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Detectar evento PASSWORD_RECOVERY (token vem no hash do URL)
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session && window.location.hash.includes("type=recovery"))) {
        setRecoveryReady(true);
      }
    });

    // Se passar 1.5s sem evento e não houver hash, não é um link válido
    if (!window.location.hash || (!window.location.hash.includes("access_token") && !window.location.hash.includes("type=recovery"))) {
      timeout = setTimeout(() => setRecoveryReady(false), 800);
    } else {
      // Há hash mas pode ainda estar a processar
      timeout = setTimeout(() => {
        setRecoveryReady((prev) => prev ?? false);
      }, 3000);
    }

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Sem token → manda para /login
  useEffect(() => {
    if (recoveryReady === false) {
      toast({
        title: "Link inválido ou expirado",
        description: "Pede um novo link de recuperação.",
        variant: "destructive",
      });
      navigate("/login", { replace: true });
    }
  }, [recoveryReady, navigate, toast]);

  const ruleResults = useMemo(() => RULES.map((r) => ({ ...r, passed: r.test(password) })), [password]);
  const allPassed = ruleResults.every((r) => r.passed);
  const matches = password.length > 0 && password === confirm;
  const canSubmit = allPassed && matches && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setSubmitting(false);
      toast({
        title: "Erro ao atualizar password",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Regista no audit log (best-effort)
    try {
      await supabase.functions.invoke("log-password-reset");
    } catch (e) {
      console.error("log-password-reset failed", e);
    }

    await supabase.auth.signOut();

    toast({
      title: "Password atualizada",
      description: "Já podes entrar com a nova password.",
    });

    navigate("/login", { replace: true });
  };

  if (recoveryReady === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (recoveryReady === false) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold font-heading text-primary">Definir nova password</h1>
          <p className="text-sm text-muted-foreground">Escolhe uma password forte para a tua conta.</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <ul className="text-xs space-y-1">
            {ruleResults.map((r) => (
              <li key={r.label} className={`flex items-center gap-2 ${r.passed ? "text-emerald-600" : "text-muted-foreground"}`}>
                {r.passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {r.label}
              </li>
            ))}
          </ul>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar nova password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
            {confirm.length > 0 && (
              <p className={`text-xs flex items-center gap-2 ${matches ? "text-emerald-600" : "text-destructive"}`}>
                {matches ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {matches ? "Passwords coincidem" : "Passwords não coincidem"}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!canSubmit}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
            {submitting ? "A atualizar..." : "Atualizar password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
