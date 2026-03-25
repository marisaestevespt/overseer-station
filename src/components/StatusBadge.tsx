import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "active" | "suspended" | "cancelled" | "setup" | "past_due" | "trialing" | "ok" | "error" | "unknown";

const statusStyles: Record<StatusType, string> = {
  active: "bg-success/20 text-success border-success/30",
  ok: "bg-success/20 text-success border-success/30",
  suspended: "bg-warning/20 text-warning border-warning/30",
  past_due: "bg-warning/20 text-warning border-warning/30",
  trialing: "bg-primary/20 text-primary border-primary/30",
  setup: "bg-primary/20 text-primary border-primary/30",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
  error: "bg-destructive/20 text-destructive border-destructive/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<StatusType, string> = {
  active: "Activo",
  ok: "OK",
  suspended: "Suspenso",
  past_due: "Em atraso",
  trialing: "Trial",
  setup: "Setup",
  cancelled: "Cancelado",
  error: "Erro",
  unknown: "Desconhecido",
};

export function StatusBadge({ status }: { status: StatusType }) {
  return (
    <Badge variant="outline" className={cn("text-xs", statusStyles[status])}>
      {statusLabels[status]}
    </Badge>
  );
}
