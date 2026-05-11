import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

export type Rectification = Database["public"]["Tables"]["rectification_requests"]["Row"];
export type RectificationInsert = Database["public"]["Tables"]["rectification_requests"]["Insert"];
export type RectificationUpdate = Database["public"]["Tables"]["rectification_requests"]["Update"];

export interface RectificationWithInstance extends Rectification {
  instances: { business_name: string } | null;
}

async function fetchRectifications(): Promise<RectificationWithInstance[]> {
  const { data, error } = await supabase
    .from("rectification_requests")
    .select("*, instances(business_name)")
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as RectificationWithInstance[]) ?? [];
}

export function useRectifications() {
  const { toast } = useToast();
  const query = useQuery({
    queryKey: ["rectification_requests"],
    queryFn: fetchRectifications,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.error) {
      console.error("useRectifications error:", query.error);
      toast({
        title: "Erro ao carregar pedidos",
        description: (query.error as Error).message,
        variant: "destructive",
      });
    }
  }, [query.error, toast]);

  return query;
}

export function useCreateRectification() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (payload: RectificationInsert) => {
      const { data, error } = await supabase
        .from("rectification_requests")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rectification_requests"] });
      toast({ title: "Pedido criado", description: "O pedido foi registado com sucesso." });
    },
    onError: (e: Error) => {
      toast({ title: "Erro a criar pedido", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateRectification() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: RectificationUpdate }) => {
      const finalPatch = { ...patch };
      if (patch.status === "completed" && !patch.completed_at) {
        finalPatch.completed_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from("rectification_requests")
        .update(finalPatch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rectification_requests"] });
      toast({ title: "Pedido atualizado" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro a atualizar", description: e.message, variant: "destructive" });
    },
  });
}

export function useDeleteRectification() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rectification_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rectification_requests"] });
      toast({ title: "Pedido eliminado" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro a eliminar", description: e.message, variant: "destructive" });
    },
  });
}
