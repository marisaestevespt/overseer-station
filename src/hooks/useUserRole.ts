import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "super_admin" | "admin" | "support";

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to load user roles", error);
        setRoles([]);
      } else {
        setRoles((data ?? []).map((r) => r.role as AppRole));
      }
      setLoading(false);
    })();
  }, [user, authLoading]);

  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = roles.includes("admin") || isSuperAdmin;
  const isSupport = roles.includes("support") || isAdmin;
  const isStaff = isSuperAdmin || roles.includes("admin") || roles.includes("support");

  return {
    roles,
    loading: authLoading || loading,
    isSuperAdmin,
    isAdmin,
    isSupport,
    isStaff,
  };
}
