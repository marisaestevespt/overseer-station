// Helpers for instance remote stats and setup checklist.

export function generateStatsKey(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  // base64url, trimmed to length
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
    .slice(0, length);
}

export function buildDefaultStatsUrl(subdomain: string | null | undefined): string {
  if (!subdomain) return "";
  return `https://${subdomain}.lyrata.pt/functions/v1/admin-stats`;
}

export type SetupChecklist = Record<string, boolean>;

export const SETUP_STEPS: { key: string; title: string; description: string }[] = [
  {
    key: "remix",
    title: "Duplicar projeto Lovable",
    description: "Abrir projeto-mãe → ⋯ → Remix.",
  },
  {
    key: "subdomain",
    title: "Configurar subdomínio",
    description: "Adicionar TXT _lovable.{subdomain} no DNS + Connect Domain no novo projeto. (O wildcard A * → 185.158.133.1 já está configurado uma vez.)",
  },
  {
    key: "metrics_window",
    title: "Instalar a janela de métricas",
    description: 'Pedir ao agente do novo projeto: "copia a edge function admin-stats do projeto original e adiciona um secret ADMIN_STATS_KEY com o valor que vou colar".',
  },
  {
    key: "register",
    title: "Registar no painel",
    description: "Colar URL e chave nos campos da instância.",
  },
  {
    key: "test",
    title: "Testar",
    description: 'Clicar "Atualizar agora" no card de métricas. Se aparecerem números → ✅.',
  },
];
