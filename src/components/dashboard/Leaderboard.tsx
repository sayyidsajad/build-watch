import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

type Row = { user: string; count: number };

export function Leaderboard({ rows }: { rows: Row[] }) {
  const max = rows[0]?.count ?? 1;
  return (
    <Card className="border-border/50 bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          Top deployers
        </CardTitle>
        <CardDescription>Ranked by total deployments</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.slice(0, 8).map((r, i) => {
          const initials = r.user.split(" ").map((n) => n[0]).join("").slice(0, 2);
          const pct = (r.count / max) * 100;
          return (
            <div key={r.user} className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="w-5 text-sm font-semibold text-muted-foreground">#{i + 1}</span>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-primary text-xs text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium">{r.user}</span>
                <Badge variant="secondary" className="font-mono">{r.count}</Badge>
              </div>
              <div className="ml-8 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">No data in range</p>}
      </CardContent>
    </Card>
  );
}
