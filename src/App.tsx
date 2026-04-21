import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/Dashboard";
import Instances from "@/pages/Instances";
import NewInstance from "@/pages/NewInstance";
import InstanceDetail from "@/pages/InstanceDetail";
import Subscriptions from "@/pages/Subscriptions";
import ActivityLogPage from "@/pages/ActivityLog";
import SettingsPage from "@/pages/Settings";
import UpdatesPage from "@/pages/Updates";
import UsersPage from "@/pages/Users";
import LoginPage from "@/pages/Login";
import ForgotPasswordPage from "@/pages/ForgotPassword";
import ResetPasswordPage from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">A carregar...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ProtectedRoute allowedRoles={["super_admin", "admin", "support"]}>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/instances" element={<Instances />} />
          <Route path="/instances/new" element={<NewInstance />} />
          <Route path="/instances/:id" element={<InstanceDetail />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/activity" element={<ActivityLogPage />} />
          <Route path="/updates" element={<UpdatesPage />} />
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={["super_admin"]}>
                <UsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={["super_admin"]}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </ProtectedRoute>
  );
}

function AuthRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">A carregar...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <LoginPage />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<AuthRoutes />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
