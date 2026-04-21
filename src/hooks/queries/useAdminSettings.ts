import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface Plan {
  name: string;
  price: number;
  features: string[];
}

export interface AdminSettings {
  subscription_plans: Plan[];
  webhook_url: string;
  github_token: string;
}

async function fetchAdminSettings(): Promise<AdminSettings> {
  const { data, error } = await supabase
    .from("admin_settings")
    .select("key, value");
  if (error) throw error;

  const settings: AdminSettings = {
    subscription_plans: [],
    webhook_url: "",
    github_token: "",
  };
  for (const row of data ?? []) {
    if (row.key === "subscription_plans") settings.subscription_plans = (row.value as unknown as Plan[]) ?? [];
    if (row.key === "webhook_url") settings.webhook_url = (row.value as unknown as string) ?? "";
    if (row.key === "github_token") settings.github_token = (row.value as unknown as string) ?? "";
  }
  return settings;
}

export function useAdminSettings() {
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["admin-settings"],
    queryFn: fetchAdminSettings,
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (query.error) {
      console.error("useAdminSettings error:", query.error);
      toast({
        title: "Erro ao carregar definições",
        description: query.error instanceof Error ? query.error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return query;
}

export function useSaveAdminSetting() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from("admin_settings")
        .update({ value: value as never, updated_at: new Date().toISOString() })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast({ title: "Guardado", description: "Configuração atualizada com sucesso." });
    },
    onError: (err) => {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro inesperado.",
        variant: "destructive",
      });
    },
  });
}
