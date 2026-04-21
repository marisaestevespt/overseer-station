import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "super_admin" | "admin" | "support";

async function fetchRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) {
    console.error("Failed to load user roles", error);
    return [];
  }
  return (data ?? []).map((r) => r.role as AppRole);
}

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: () => fetchRoles(user!.id),
    enabled: !!user && !authLoading,
    staleTime: 5 * 60_000, // 5 min — roles mudam raramente
    gcTime: 10 * 60_000,
    retry: 1,
  });

  const roles = query.data ?? [];
  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = roles.includes("admin") || isSuperAdmin;
  const isSupport = roles.includes("support") || isAdmin;
  const isStaff = isSuperAdmin || roles.includes("admin") || roles.includes("support");

  return {
    roles,
    loading: authLoading || (!!user && query.isLoading),
    isSuperAdmin,
    isAdmin,
    isSupport,
    isStaff,
  };
}
