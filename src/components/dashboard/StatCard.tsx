import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent?: "primary" | "success" | "warm" | "accent";
};

const accents: Record<NonNullable<Props["accent"]>, string> = {
  primary: "bg-gradient-primary",
  success: "bg-gradient-success",
  warm: "bg-gradient-warm",
  accent: "bg-accent",
};

export function StatCard({ label, value, hint, icon: Icon, accent = "primary" }: Props) {
  return (
    <Card className="relative overflow-hidden border-border/50 bg-gradient-card p-6 shadow-card transition-all hover:shadow-elegant">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl text-primary-foreground shadow-md", accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
