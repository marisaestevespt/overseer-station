export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Definições</h1>
      <div className="glass-card p-6">
        <p className="text-muted-foreground text-sm">
          Configurações do painel de administração. As variáveis de ambiente (Stripe, Resend, etc.) devem ser configuradas no Lovable Cloud.
        </p>
      </div>
    </div>
  );
}
