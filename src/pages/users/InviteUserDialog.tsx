import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { AppRole } from "@/hooks/useUserRole";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  role: AppRole;
  inviting: boolean;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: AppRole) => void;
  onSubmit: () => void;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  email,
  role,
  inviting,
  onEmailChange,
  onRoleChange,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select value={role} onValueChange={(v) => onRoleChange(v as AppRole)}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={inviting}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={inviting || !email.trim()}>
            {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
