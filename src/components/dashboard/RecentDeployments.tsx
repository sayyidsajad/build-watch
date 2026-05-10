import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Deployment, formatDuration } from "@/lib/deployments";
import { format } from "date-fns";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";

export function RecentDeployments({ items }: { items: Deployment[] }) {
  const recent = [...items].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);
  return (
    <Card className="border-border/50 bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle>Recent deployments</CardTitle>
        <CardDescription>Latest activity across projects</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Env</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Build time</TableHead>
              <TableHead className="text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  {d.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {d.externalUrl ? (
                      <a href={d.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
                        {d.project}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      d.project
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={d.source && d.source !== "mock" ? "default" : "secondary"}>
                    {d.source === "github-actions" ? "GitHub" : d.source === "jenkins" ? "Jenkins" : "Sample"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{d.environment}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{d.user}</TableCell>
                <TableCell className="font-mono text-sm">{formatDuration(d.buildTimeSec)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {format(d.date, "MMM d, HH:mm")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
