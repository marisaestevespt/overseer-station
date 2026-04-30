import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight, KeyRound, Copy, Check } from "lucide-react";
import { generateStatsKey, SETUP_STEPS, type SetupChecklist } from "@/lib/instanceStats";
import { ROOT_DOMAIN } from "@/lib/subdomain";
import type { Database } from "@/integrations/supabase/types";

type Instance = Database["public"]["Tables"]["instances"]["Row"];

interface Props {
  instance: Instance;
}

export function InstanceSetupGuideCard({ instance }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const checklist: SetupChecklist = (instance.setup_checklist as SetupChecklist | null) ?? {};
  const completed = SETUP_STEPS.filter((s) => checklist[s.key]).length;

  async function toggleStep(key: string, value: boolean) {
    const next = { ...checklist, [key]: value };
    const { error } = await supabase
      .from("instances")
      .update({ setup_checklist: next })
      .eq("id", instance.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["instance", instance.id] });
  }

  function generateKey() {
    const k = generateStatsKey(32);
    setGeneratedKey(k);
    navigator.clipboard.writeText(k).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Nova chave gerada e copiada" });
  }

  function copyKey() {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const subdomainPlaceholder = instance.subdomain ?? "{subdominio}";

  return (
    <div className="glass-card p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <h2 className="text-lg font-semibold font-heading">Como configurar uma nova instância</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {completed}/{SETUP_STEPS.length} concluídos
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <ol className="space-y-3">
            {SETUP_STEPS.map((step, idx) => {
              const done = !!checklist[step.key];
              return (
                <li key={step.key} className="flex gap-3">
                  <Checkbox
                    checked={done}
                    onCheckedChange={(v) => toggleStep(step.key, v === true)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                      {idx + 1}. {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description.replace("{subdomain}", subdomainPlaceholder)}
                    </p>

                    {step.key === "subdomain" && (
                      <code className="inline-block mt-1 text-xs bg-muted px-2 py-0.5 rounded">
                        TXT _lovable.{subdomainPlaceholder}
                      </code>
                    )}

                    {step.key === "metrics_window" && (
                      <div className="mt-2 space-y-2">
                        <Button size="sm" variant="outline" onClick={generateKey}>
                          <KeyRound className="mr-2 h-3 w-3" />
                          Gerar nova chave
                        </Button>
                        {generatedKey && (
                          <div className="flex items-center gap-2 max-w-full">
                            <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                              {generatedKey}
                            </code>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyKey}>
                              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {step.key === "register" && instance.subdomain && (
                      <code className="inline-block mt-1 text-xs bg-muted px-2 py-0.5 rounded break-all">
                        https://{instance.subdomain}.{ROOT_DOMAIN}/functions/v1/admin-stats
                      </code>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
