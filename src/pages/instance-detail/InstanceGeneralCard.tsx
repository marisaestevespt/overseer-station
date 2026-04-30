import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Copy, ExternalLink, Pencil } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Instance = Database["public"]["Tables"]["instances"]["Row"];

interface Props {
  instance: Instance;
  onSaveField: (field: keyof Instance, value: string) => Promise<void> | void;
}

const FIELDS: { label: string; field: keyof Instance; multiline?: boolean }[] = [
  { label: "Nome do negócio", field: "business_name" },
  { label: "Owner", field: "owner_name" },
  { label: "Email", field: "owner_email" },
  { label: "URL de estatísticas", field: "stats_url" },
  { label: "Chave de estatísticas", field: "stats_key" },
  { label: "Notas", field: "notes", multiline: true },
];

export function InstanceGeneralCard({ instance, onSaveField }: Props) {
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  function startEdit(field: keyof Instance, currentValue: string) {
    setEditing({ ...editing, [field]: true });
    setEditValues({ ...editValues, [field]: currentValue || "" });
  }

  async function save(field: keyof Instance) {
    await onSaveField(field, editValues[field] ?? "");
    setEditing({ ...editing, [field]: false });
  }

  function copyUrl() {
    if (instance.instance_url) {
      navigator.clipboard.writeText(instance.instance_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="glass-card p-5">
      <h2 className="text-lg font-semibold mb-3 font-heading">Informação Geral</h2>
      {FIELDS.map(({ label, field, multiline }) => (
        <div key={field} className="flex items-center justify-between py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground w-40">{label}</span>
          {editing[field] ? (
            <div className="flex-1 flex gap-2 ml-4">
              {multiline ? (
                <Textarea
                  value={editValues[field]}
                  onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
                  rows={2}
                  className="flex-1"
                />
              ) : (
                <Input
                  value={editValues[field]}
                  onChange={(e) => setEditValues({ ...editValues, [field]: e.target.value })}
                  className="flex-1"
                />
              )}
              <Button size="sm" onClick={() => save(field)}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 ml-4">
              <span className="text-sm">{(instance[field] as string) || "—"}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => startEdit(field, (instance[field] as string) || "")}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2 mt-4">
        {instance.instance_url && (
          <>
            <Button variant="outline" size="sm" onClick={copyUrl}>
              {copied ? <Check className="mr-2 h-3 w-3" /> : <Copy className="mr-2 h-3 w-3" />}
              {copied ? "Copiado" : "Copiar URL"}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={instance.instance_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-3 w-3" />
                Abrir instância
              </a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
