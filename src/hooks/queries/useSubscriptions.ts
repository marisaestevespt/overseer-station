import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { describeEdgeFunctionError } from "@/lib/edgeFunctionError";
import type { Database } from "@/integrations/supabase/types";

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
type Instance = Database["public"]["Tables"]["instances"]["Row"];

export interface SubscriptionWithInstance extends Subscription {
  instances: Instance | null;
}

async function fetchSubscriptions(): Promise<SubscriptionWithInstance[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*, instances(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as SubscriptionWithInstance[]) ?? [];
}

export function useSubscriptions() {
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["subscriptions"],
    queryFn: fetchSubscriptions,
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (query.error) {
      console.error("useSubscriptions error:", query.error);
      toast({
        title: "Erro ao carregar subscrições",
        description: describeEdgeFunctionError(query.error),
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return query;
}
