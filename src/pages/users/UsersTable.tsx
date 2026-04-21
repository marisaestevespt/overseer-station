import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Power, PowerOff } from "lucide-react";
import type { AppRole } from "@/hooks/useUserRole";
import type { ManagedUser } from "./types";

interface Props {
  users: ManagedUser[];
  busyId: string | null;
  onRoleChange: (userId: string, role: AppRole) => void;
  onRequestPromote: (user: ManagedUser) => void;
  onRequestDeactivate: (user: ManagedUser) => void;
  onReactivate: (user: ManagedUser) => void;
}

export function UsersTable({
  users,
  busyId,
  onRoleChange,
  onRequestPromote,
  onRequestDeactivate,
  onReactivate,
}: Props) {
  return (
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
        {users.map((u) => {
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
                        onRequestPromote(u);
                      } else {
                        onRoleChange(u.id, newRole);
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
                  onClick={() => (isBanned ? onReactivate(u) : onRequestDeactivate(u))}
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
  );
}
