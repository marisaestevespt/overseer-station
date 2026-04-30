import { type LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "default" | "success" | "warning" | "destructive";
  onClick?: () => void;
}

const accentStyles = {
  default: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export function KPICard({ title, value, icon: Icon, accent = "default", onClick }: KPICardProps) {
  const clickable = typeof onClick === "function";
  const Wrapper: any = clickable ? "button" : "div";
  return (
    <Wrapper
      type={clickable ? "button" : undefined}
      onClick={onClick}
      className={`glass-card p-5 w-full text-left ${
        clickable ? "cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ring" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`mt-1 text-2xl font-bold ${accentStyles[accent]}`}>{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${accentStyles[accent]} opacity-60`} />
      </div>
    </Wrapper>
  );
}
