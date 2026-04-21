import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface EmailSettings {
  id: string;
  business_name: string;
  contact_email: string;
  phone: string;
  address: string;
  business_hours: string;
  website: string;
  logo_url: string;
  instagram_url: string;
  linkedin_url: string;
  facebook_url: string;
  twitter_url: string;
}

export const defaultEmailSettings: EmailSettings = {
  id: "",
  business_name: "Lyrata®",
  contact_email: "suporte@lyrata.pt",
  phone: "",
  address: "",
  business_hours: "Seg-Sex, 9h-18h",
  website: "https://lyrata.pt",
  logo_url: "",
  instagram_url: "",
  linkedin_url: "",
  facebook_url: "",
  twitter_url: "",
};

async function fetchEmailSettings(): Promise<EmailSettings> {
  const { data, error } = await supabase
    .from("email_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return defaultEmailSettings;
  return {
    id: data.id ?? "",
    business_name: data.business_name ?? "",
    contact_email: data.contact_email ?? "",
    phone: data.phone ?? "",
    address: data.address ?? "",
    business_hours: data.business_hours ?? "",
    website: data.website ?? "",
    logo_url: data.logo_url ?? "",
    instagram_url: data.instagram_url ?? "",
    linkedin_url: data.linkedin_url ?? "",
    facebook_url: data.facebook_url ?? "",
    twitter_url: data.twitter_url ?? "",
  };
}

export function useEmailSettings() {
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["email-settings"],
    queryFn: fetchEmailSettings,
    staleTime: 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (query.error) {
      console.error("useEmailSettings error:", query.error);
      toast({
        title: "Erro ao carregar definições de email",
        description: query.error instanceof Error ? query.error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return query;
}

export function useSaveEmailSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (settings: EmailSettings) => {
      const { id, ...updates } = settings;
      const { error } = await supabase
        .from("email_settings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-settings"] });
      toast({ title: "Guardado", description: "Definições de email atualizadas com sucesso." });
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
