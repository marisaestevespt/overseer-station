import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { describeEdgeFunctionError } from "@/lib/edgeFunctionError";
import type { Database } from "@/integrations/supabase/types";

type Instance = Database["public"]["Tables"]["instances"]["Row"];
type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

export interface InstanceWithSubscriptions extends Instance {
  subscriptions: Subscription[] | null;
}

async function fetchInstances(): Promise<InstanceWithSubscriptions[]> {
  const { data, error } = await supabase
    .from("instances")
    .select("*, subscriptions(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as InstanceWithSubscriptions[]) ?? [];
}

export function useInstances() {
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["instances"],
    queryFn: fetchInstances,
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (query.error) {
      console.error("useInstances error:", query.error);
      toast({
        title: "Erro ao carregar instâncias",
        description: describeEdgeFunctionError(query.error),
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return query;
}

async function fetchInstance(id: string): Promise<InstanceWithSubscriptions | null> {
  const { data, error } = await supabase
    .from("instances")
    .select("*, subscriptions(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as InstanceWithSubscriptions) ?? null;
}

export function useInstance(id: string | undefined) {
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["instance", id],
    queryFn: () => fetchInstance(id!),
    enabled: !!id,
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (query.error) {
      console.error("useInstance error:", query.error);
      toast({
        title: "Erro ao carregar instância",
        description: describeEdgeFunctionError(query.error),
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return query;
}
