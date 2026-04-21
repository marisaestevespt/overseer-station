import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { describeEdgeFunctionError } from "@/lib/edgeFunctionError";
import type { Database } from "@/integrations/supabase/types";

type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];

export interface ActivityLogWithInstance extends ActivityLog {
  instances: { business_name: string } | null;
}

async function fetchActivityLog(limit?: number): Promise<ActivityLogWithInstance[]> {
  let q = supabase
    .from("activity_log")
    .select("*, instances(business_name)")
    .order("created_at", { ascending: false });
  if (limit && limit > 0) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as ActivityLogWithInstance[]) ?? [];
}

export function useActivityLog(limit?: number) {
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["activity_log", limit ?? "all"],
    queryFn: () => fetchActivityLog(limit),
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (query.error) {
      console.error("useActivityLog error:", query.error);
      toast({
        title: "Erro ao carregar log de atividade",
        description: describeEdgeFunctionError(query.error),
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return query;
}

async function fetchActivityLogForInstance(instanceId: string): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .eq("instance_id", instanceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useInstanceActivityLog(instanceId: string | undefined) {
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["activity_log", "instance", instanceId],
    queryFn: () => fetchActivityLogForInstance(instanceId!),
    enabled: !!instanceId,
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (query.error) {
      console.error("useInstanceActivityLog error:", query.error);
      toast({
        title: "Erro ao carregar histórico",
        description: describeEdgeFunctionError(query.error),
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return query;
}
