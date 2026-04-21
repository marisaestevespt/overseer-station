import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Mail } from "lucide-react";
import type { AppRole } from "@/hooks/useUserRole";
import type { PendingInvite } from "./types";

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

interface Props {
  pending: PendingInvite[];
  busyId: string | null;
  onResend: (email: string, role: AppRole) => void;
}

export function PendingInvitesTable({ pending, busyId, onResend }: Props) {
  return (
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
                onClick={() => onResend(p.email, p.role)}
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
  );
}
