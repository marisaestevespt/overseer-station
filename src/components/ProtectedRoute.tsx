import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({ children, requireSuperAdmin = true }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const loading = authLoading || roleLoading;
  const denied = !loading && user && requireSuperAdmin && !isSuperAdmin;

  useEffect(() => {
    if (denied) {
      toast({
        title: "Acesso negado",
        description: "Não tens permissões para aceder ao painel de administração.",
        variant: "destructive",
      });
    }
  }, [denied, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">A verificar permissões...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    // Sign out unauthorised user and redirect
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
