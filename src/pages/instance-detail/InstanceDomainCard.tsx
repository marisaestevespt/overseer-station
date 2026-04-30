import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, Copy, ExternalLink, Pencil, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  ROOT_DOMAIN,
  buildHealthCheckUrl,
  buildInstanceUrl,
  isValidSubdomain,
} from "@/lib/subdomain";
import type { Database } from "@/integrations/supabase/types";

type Instance = Database["public"]["Tables"]["instances"]["Row"];

interface Props {
  instance: Instance;
}

export function InstanceDomainCard({ instance }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(instance.subdomain ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const subdomain = instance.subdomain;
  const url = subdomain ? buildInstanceUrl(subdomain) : null;
  const dnsConfigured = (instance as any).dns_configured as boolean;
  const sslActive = (instance as any).ssl_active as boolean;

  function copyUrl() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["instance", instance.id] });
    queryClient.invalidateQueries({ queryKey: ["instances"] });
    queryClient.invalidateQueries({ queryKey: ["activity_log"] });
  }

  async function saveSubdomain() {
    const v = value.toLowerCase().trim();
    if (!isValidSubdomain(v)) {
      setError("Apenas letras minúsculas, números e hífens (1-32 caracteres).");
      return;
    }
    setSaving(true);

    // Uniqueness check (excluding current)
    const { data: existing } = await supabase
      .from("instances")
      .select("id")
      .eq("subdomain", v)
      .neq("id", instance.id)
      .maybeSingle();
    if (existing) {
      setError("Este subdomínio já está em uso.");
      setSaving(false);
      return;
    }

    const newUrl = buildInstanceUrl(v);
    const newHealthUrl = buildHealthCheckUrl(v);
    const { error: updErr } = await supabase
      .from("instances")
      .update({
        subdomain: v,
        instance_url: newUrl,
        health_check_url: newHealthUrl,
      } as any)
      .eq("id", instance.id);
    if (updErr) {
      setError(updErr.message);
      setSaving(false);
      return;
    }
    await supabase.from("activity_log").insert({
      instance_id: instance.id,
      action: "Subdomínio alterado",
      details: `Novo: ${v}.${ROOT_DOMAIN}`,
      performed_by: "admin",
    });
    toast({ title: "Subdomínio actualizado" });
    setEditing(false);
    setError(null);
    setSaving(false);
    refresh();
  }

  async function toggleFlag(field: "dns_configured" | "ssl_active", next: boolean) {
    const { error: updErr } = await supabase
      .from("instances")
      .update({ [field]: next } as any)
      .eq("id", instance.id);
    if (updErr) {
      toast({ title: "Erro", description: updErr.message, variant: "destructive" });
      return;
    }
    await supabase.from("activity_log").insert({
      instance_id: instance.id,
      action: field === "dns_configured" ? `DNS ${next ? "configurado" : "marcado como pendente"}` : `SSL ${next ? "activado" : "desactivado"}`,
      performed_by: "admin",
    });
    refresh();
  }

  const allReady = !!subdomain && dnsConfigured && sslActive;

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-heading">Configuração de Domínio</h2>
        {allReady ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" /> Pronto
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" /> Pendente
          </span>
        )}
      </div>

      {/* URL final */}
      <div className="space-y-2">
        <span className="text-sm text-muted-foreground">URL final</span>
        {url ? (
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm bg-muted px-2 py-1 rounded">{url}</code>
            <Button variant="outline" size="sm" onClick={copyUrl}>
              {copied ? <Check className="mr-2 h-3 w-3" /> : <Copy className="mr-2 h-3 w-3" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-3 w-3" />
                Abrir
              </a>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem subdomínio definido.</p>
        )}
      </div>

      {/* Subdomain editor */}
      <div className="space-y-2">
        <span className="text-sm text-muted-foreground">Subdomínio</span>
        {editing ? (
          <div className="space-y-2">
            <div className="flex items-stretch max-w-md">
              <Input
                value={value}
                onChange={(e) => {
                  setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  setError(null);
                }}
                placeholder="exemplo"
                className="rounded-r-none"
              />
              <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-sm text-muted-foreground whitespace-nowrap">
                .{ROOT_DOMAIN}
              </span>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={saveSubdomain} disabled={saving}>
                {saving ? "A guardar..." : "Guardar"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setEditing(false); setValue(subdomain ?? ""); setError(null); }}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm">{subdomain ? `${subdomain}.${ROOT_DOMAIN}` : "—"}</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Checklist */}
      <div className="space-y-3 pt-2 border-t border-border/50">
        <h3 className="text-sm font-medium">Checklist de DNS</h3>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
          <li>
            Adicionar registo <code className="bg-muted px-1 rounded">A *</code> →{" "}
            <code className="bg-muted px-1 rounded">185.158.133.1</code>{" "}
            <span className="text-xs">(uma vez, wildcard para todos os subdomínios)</span>
          </li>
          <li>
            Adicionar registo <code className="bg-muted px-1 rounded">TXT _lovable.{subdomain ?? "{subdominio}"}</code> no DNS conforme indicado pelo Lovable
          </li>
          <li>Connect Domain no projeto Lovable do cliente</li>
          <li>Aguardar emissão de certificado SSL</li>
        </ol>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">DNS configurado</p>
            <p className="text-xs text-muted-foreground">Registos A/TXT propagados</p>
          </div>
          <Switch checked={dnsConfigured} onCheckedChange={(v) => toggleFlag("dns_configured", v)} />
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium">SSL activo</p>
            <p className="text-xs text-muted-foreground">Certificado emitido e válido</p>
          </div>
          <Switch checked={sslActive} onCheckedChange={(v) => toggleFlag("ssl_active", v)} />
        </div>
      </div>
    </div>
  );
}
