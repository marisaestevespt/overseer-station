import { type LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "default" | "success" | "warning" | "destructive";
}

const accentStyles = {
  default: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export function KPICard({ title, value, icon: Icon, accent = "default" }: KPICardProps) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`mt-1 text-2xl font-bold ${accentStyles[accent]}`}>{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${accentStyles[accent]} opacity-60`} />
      </div>
    </div>
  );
}
