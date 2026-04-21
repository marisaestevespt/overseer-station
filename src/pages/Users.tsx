import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserPlus, Users as UsersIcon } from "lucide-react";
import type { AppRole } from "@/hooks/useUserRole";
import { describeEdgeFunctionError } from "@/lib/edgeFunctionError";
import { TableSkeleton } from "@/components/TableSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { DataPagination } from "@/components/DataPagination";
import { UsersTable } from "./users/UsersTable";
import { PendingInvitesTable } from "./users/PendingInvitesTable";
import { InviteUserDialog } from "./users/InviteUserDialog";
import type { ManagedUser, PendingInvite } from "./users/types";

const PAGE_SIZE = 20;

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("support");
  const [inviting, setInviting] = useState(false);
  const [confirmUser, setConfirmUser] = useState<ManagedUser | null>(null);
  const [confirmPromote, setConfirmPromote] = useState<{ userId: string; email: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("list-users");
      if (error) {
        toast({
          title: "Erro ao carregar utilizadores",
          description: describeEdgeFunctionError(error, "list-users"),
          variant: "destructive",
        });
      } else if (data) {
        setUsers(data.users ?? []);
        setPending(data.pending ?? []);
      }
    } catch (err) {
      toast({
        title: "Erro ao carregar utilizadores",
        description: describeEdgeFunctionError(err, "list-users"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedUsers = useMemo(
    () => users.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [users, currentPage],
  );

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const { error } = await supabase.functions.invoke("invite-user", {
      body: { email: inviteEmail.trim(), role: inviteRole },
    });
    setInviting(false);
    if (error) {
      toast({
        title: "Erro a convidar",
        description: describeEdgeFunctionError(error, "invite-user"),
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Convite enviado", description: `${inviteEmail} vai receber um email.` });
    setInviteOpen(false);
    setInviteEmail("");
    setInviteRole("support");
    load();
  }

  async function handleRoleChange(userId: string, role: AppRole) {
    setBusyId(userId);
    const { error } = await supabase.functions.invoke("update-user-role", {
      body: { user_id: userId, role },
    });
    setBusyId(null);
    if (error) {
      toast({
        title: "Erro",
        description: describeEdgeFunctionError(error, "update-user-role"),
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Role atualizado" });
    load();
  }

  async function handleToggleActive(user: ManagedUser) {
    setBusyId(user.id);
    const isBanned = user.banned_until && new Date(user.banned_until) > new Date();
    const fn = isBanned ? "reactivate-user" : "deactivate-user";
    const { error } = await supabase.functions.invoke(fn, { body: { user_id: user.id } });
    setBusyId(null);
    if (error) {
      toast({
        title: "Erro",
        description: describeEdgeFunctionError(error, fn),
        variant: "destructive",
      });
      return;
    }
    toast({ title: isBanned ? "Utilizador reativado" : "Utilizador desativado" });
    load();
  }

  async function handleResendInvite(email: string, role: AppRole) {
    setBusyId(email);
    const { error } = await supabase.functions.invoke("invite-user", {
      body: { email, role },
    });
    setBusyId(null);
    if (error) {
      toast({
        title: "Erro",
        description: describeEdgeFunctionError(error, "invite-user"),
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Convite reenviado" });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-semibold">Utilizadores</h1>
          <p className="text-muted-foreground">Gere quem tem acesso ao painel e com que permissões.</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Convidar utilizador
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Utilizadores activos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={6} columns={6} />
          ) : users.length === 0 ? (
            <EmptyState
              icon={<UsersIcon />}
              title="Sem utilizadores"
              description="Convida o primeiro utilizador para começar."
              actionLabel="Convidar utilizador"
              onAction={() => setInviteOpen(true)}
            />
          ) : (
            <>
              <UsersTable
                users={paginatedUsers}
                busyId={busyId}
                onRoleChange={handleRoleChange}
                onRequestPromote={(u) => setConfirmPromote({ userId: u.id, email: u.email })}
                onRequestDeactivate={setConfirmUser}
                onReactivate={handleToggleActive}
              />
              <DataPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Convites pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <PendingInvitesTable pending={pending} busyId={busyId} onResend={handleResendInvite} />
          </CardContent>
        </Card>
      )}

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        email={inviteEmail}
        role={inviteRole}
        inviting={inviting}
        onEmailChange={setInviteEmail}
        onRoleChange={setInviteRole}
        onSubmit={handleInvite}
      />

      <AlertDialog open={!!confirmUser} onOpenChange={(o) => !o && setConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar utilizador?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmUser?.email} deixará de conseguir aceder ao painel até ser reativado. Esta ação pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmUser) {
                  const u = confirmUser;
                  setConfirmUser(null);
                  handleToggleActive(u);
                }
              }}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmPromote} onOpenChange={(o) => !o && setConfirmPromote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Promover a Super Admin?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmPromote?.email}</strong> passará a ter acesso total ao painel, incluindo gestão de utilizadores, definições e capacidade de promover ou despromover outros administradores. Esta ação só deve ser usada para pessoas de confiança.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmPromote) {
                  const { userId } = confirmPromote;
                  setConfirmPromote(null);
                  handleRoleChange(userId, "super_admin");
                }
              }}
            >
              Promover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
