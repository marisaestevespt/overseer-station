import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface InstanceVersion {
  id: string;
  business_name: string;
  status: string;
  instance_url: string | null;
  health_check_url: string | null;
  github_repo: string | null;
  current_version: string | null;
  last_update_check: string | null;
}

async function fetchUpdatesInstances(): Promise<InstanceVersion[]> {
  const { data, error } = await supabase
    .from("instances")
    .select("id, business_name, status, instance_url, health_check_url, github_repo, current_version, last_update_check")
    .order("business_name");
  if (error) throw error;
  return (data ?? []) as InstanceVersion[];
}

export function useUpdatesInstances() {
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["updates-instances"],
    queryFn: fetchUpdatesInstances,
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (query.error) {
      console.error("useUpdatesInstances error:", query.error);
      toast({
        title: "Erro ao carregar atualizações",
        description: query.error instanceof Error ? query.error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return query;
}
