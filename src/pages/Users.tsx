import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Mail, Power, PowerOff, Loader2, Users as UsersIcon } from "lucide-react";
import type { AppRole } from "@/hooks/useUserRole";
import { describeEdgeFunctionError } from "@/lib/edgeFunctionError";
import { TableSkeleton } from "@/components/TableSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { DataPagination } from "@/components/DataPagination";

interface ManagedUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  roles: AppRole[];
}

interface PendingInvite {
  email: string;
  role: AppRole;
  created_at: string;
}

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  support: "Support",
};

const ROLE_VARIANTS: Record<AppRole, "default" | "secondary" | "outline"> = {
  super_admin: "default",
  admin: "secondary",
  support: "outline",
};

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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Criado</TableHead>
                    <TableHead>Último login</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((u) => {
                    const currentRole = (u.roles[0] as AppRole | undefined) ?? "support";
                    const isBanned = !!u.banned_until && new Date(u.banned_until) > new Date();
                    const isBusy = busyId === u.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.email}</TableCell>
                        <TableCell>
                          {u.roles.length === 0 ? (
                            <Badge variant="outline">Sem role</Badge>
                          ) : (
                            <Select
                              value={currentRole}
                              onValueChange={(v) => {
                                const newRole = v as AppRole;
                                if (newRole === currentRole) return;
                                if (newRole === "super_admin") {
                                  setConfirmPromote({ userId: u.id, email: u.email });
                                } else {
                                  handleRoleChange(u.id, newRole);
                                }
                              }}
                              disabled={isBusy}
                            >
                              <SelectTrigger className="w-[160px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="support">Support</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("pt-PT")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("pt-PT") : "Nunca"}
                        </TableCell>
                        <TableCell>
                          {isBanned ? (
                            <Badge variant="destructive">Desativado</Badge>
                          ) : u.email_confirmed_at ? (
                            <Badge>Activo</Badge>
                          ) : (
                            <Badge variant="secondary">Pendente</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => (isBanned ? handleToggleActive(u) : setConfirmUser(u))}
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isBanned ? (
                              <Power className="h-4 w-4" />
                            ) : (
                              <PowerOff className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role atribuído</TableHead>
                  <TableHead>Convidado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((p) => (
                  <TableRow key={p.email}>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANTS[p.role]}>{ROLE_LABELS[p.role]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(p.created_at).toLocaleString("pt-PT")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyId === p.email}
                        onClick={() => handleResendInvite(p.email, p.role)}
                      >
                        {busyId === p.email ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="mr-2 h-4 w-4" />
                        )}
                        Reenviar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar utilizador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="utilizador@exemplo.pt"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin — acesso total</SelectItem>
                  <SelectItem value="admin">Admin — gere instâncias e subscrições</SelectItem>
                  <SelectItem value="support">Support — só leitura</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>
              Cancelar
            </Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
