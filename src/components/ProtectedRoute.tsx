import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** @deprecated usar allowedRoles */
  requireSuperAdmin?: boolean;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({ children, requireSuperAdmin, allowedRoles }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { roles, isSuperAdmin, isStaff, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const loading = authLoading || roleLoading;

  // Cálculo de permissão
  let hasAccess = false;
  if (!loading && user) {
    if (allowedRoles && allowedRoles.length > 0) {
      hasAccess = roles.some((r) => allowedRoles.includes(r));
    } else if (requireSuperAdmin) {
      hasAccess = isSuperAdmin;
    } else {
      hasAccess = isStaff;
    }
  }

  const denied = !loading && !!user && !hasAccess;

  useEffect(() => {
    if (denied && !allowedRoles) {
      toast({
        title: "Acesso negado",
        description: "Não tens permissões para aceder a esta área.",
        variant: "destructive",
      });
    }
  }, [denied, toast, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">A verificar permissões...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Não tem nenhum role staff → fora do painel
  if (!isStaff) return <Navigate to="/login" replace />;

  // Tem role staff mas a página exige role mais alto → mostra 403 dentro do painel
  if (denied) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="flex flex-row items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            <CardTitle>Acesso restrito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Apenas <strong>super_admin</strong> pode aceder a esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
