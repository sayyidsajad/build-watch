"use client";

import { useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { Activity, Clock, Gauge, Rocket, TrendingUp, Zap } from "lucide-react";
import { format, startOfDay, subDays } from "date-fns";

import { Filters, RangePreset } from "@/components/dashboard/Filters";
import { StatCard } from "@/components/dashboard/StatCard";
import { DeploymentsChart } from "@/components/dashboard/DeploymentsChart";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { BuildTimeChart } from "@/components/dashboard/BuildTimeChart";
import { IntegrationPanel } from "@/components/dashboard/IntegrationPanel";
import { RecentDeployments } from "@/components/dashboard/RecentDeployments";
import { Deployment, deployments, formatDuration, median } from "@/lib/deployments";
import { clearIntegrationState, loadIntegrationState, saveIntegrationState, IntegrationState } from "@/lib/integrations";

export function DashboardPage() {
  const [preset, setPreset] = useState<RangePreset>("30d");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [project, setProject] = useState("all");
  const [environment, setEnvironment] = useState("all");
  const [integration, setIntegration] = useState<IntegrationState>(() => loadIntegrationState());

  const sourceDeployments = integration.deployments.length ? integration.deployments : deployments;

  const availableProjects = useMemo(() => {
    return Array.from(new Set(sourceDeployments.map((deployment) => deployment.project))).sort();
  }, [sourceDeployments]);

  const availableEnvironments = useMemo(() => {
    return Array.from(new Set(sourceDeployments.map((deployment) => deployment.environment))).sort() as Deployment["environment"][];
  }, [sourceDeployments]);

  const { from, to } = useMemo(() => {
    const today = startOfDay(new Date());
    if (preset === "custom" && customRange?.from) {
      return { from: startOfDay(customRange.from), to: startOfDay(customRange.to ?? today) };
    }
    const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
    return { from: subDays(today, days - 1), to: today };
  }, [preset, customRange]);

  const filtered = useMemo(() => {
    return sourceDeployments.filter((d) => {
      if (d.date < from) return false;
      if (d.date > new Date(to.getTime() + 86_400_000)) return false;
      if (project !== "all" && d.project !== project) return false;
      if (environment !== "all" && d.environment !== environment) return false;
      return true;
    });
  }, [from, to, project, environment, sourceDeployments]);

  const daily = useMemo(() => {
    const map = new Map<string, { count: number; failed: number }>();
    const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      map.set(format(d, "yyyy-MM-dd"), { count: 0, failed: 0 });
    }
    filtered.forEach((d) => {
      const key = format(d.date, "yyyy-MM-dd");
      const cur = map.get(key) ?? { count: 0, failed: 0 };
      cur.count += 1;
      if (d.status === "failed") cur.failed += 1;
      map.set(key, cur);
    });
    return Array.from(map.entries()).map(([k, v]) => ({
      date: format(new Date(k), "MMM d"),
      count: v.count,
      failed: v.failed,
    }));
  }, [filtered, from, to]);

  const leaderboard = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((d) => m.set(d.user, (m.get(d.user) ?? 0) + 1));
    return Array.from(m.entries())
      .map(([user, count]) => ({ user, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const buildTimes = filtered.map((d) => d.buildTimeSec);
  const avgBuild = buildTimes.length ? buildTimes.reduce((a, b) => a + b, 0) / buildTimes.length : 0;
  const maxBuild = buildTimes.length ? Math.max(...buildTimes) : 0;
  const minBuild = buildTimes.length ? Math.min(...buildTimes) : 0;
  const medBuild = median(buildTimes);

  const buckets = useMemo(() => {
    const ranges = [
      { range: "<1m", min: 0, max: 60 },
      { range: "1–2m", min: 60, max: 120 },
      { range: "2–4m", min: 120, max: 240 },
      { range: "4–6m", min: 240, max: 360 },
      { range: "6–10m", min: 360, max: 600 },
      { range: "10m+", min: 600, max: Infinity },
    ];
    return ranges.map((r) => ({
      range: r.range,
      count: buildTimes.filter((b) => b >= r.min && b < r.max).length,
    }));
  }, [buildTimes]);

  const totalDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
  const avgPerDay = filtered.length / totalDays;
  const top = leaderboard[0];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur">
        <div className="container flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-elegant">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Deployment Analytics</h1>
              <p className="text-xs text-muted-foreground">Real-time insights into your team&apos;s shipping velocity</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Live
          </div>
        </div>
      </header>

      <main className="container space-y-6 py-8">
        <IntegrationPanel
          connection={integration.connection}
          importedCount={integration.deployments.length}
          lastSyncedAt={integration.lastSyncedAt}
          onImported={(connection, importedDeployments) => {
            const nextState = {
              connection,
              deployments: importedDeployments,
              lastSyncedAt: new Date().toISOString(),
            };
            setIntegration(nextState);
            saveIntegrationState(nextState);
            setProject("all");
            setEnvironment("all");
          }}
          onClear={() => {
            clearIntegrationState();
            setIntegration({ deployments: [] });
            setProject("all");
            setEnvironment("all");
          }}
        />

        <Filters
          preset={preset}
          onPreset={setPreset}
          customRange={customRange}
          onCustomRange={(r) => { setCustomRange(r); if (r) setPreset("custom"); }}
          project={project}
          onProject={setProject}
          environment={environment}
          onEnvironment={setEnvironment}
          projects={availableProjects}
          environments={availableEnvironments}
        />

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total deployments" value={filtered.length.toLocaleString()} hint={`${totalDays} days`} icon={Rocket} accent="primary" />
          <StatCard label="Avg / day" value={avgPerDay.toFixed(1)} hint="Across selected range" icon={TrendingUp} accent="accent" />
          <StatCard label="Top deployer" value={top?.user.split(" ")[0] ?? "—"} hint={top ? `${top.count} deployments` : "No data"} icon={Activity} accent="success" />
          <StatCard label="Avg build time" value={formatDuration(avgBuild)} hint={`Median ${formatDuration(medBuild)}`} icon={Clock} accent="warm" />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DeploymentsChart data={daily} />
          </div>
          <Leaderboard rows={leaderboard} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="grid gap-4 sm:grid-cols-3 lg:col-span-1 lg:grid-cols-1">
            <StatCard label="Slowest build" value={formatDuration(maxBuild)} icon={Gauge} accent="warm" />
            <StatCard label="Median build" value={formatDuration(medBuild)} icon={Clock} accent="primary" />
            <StatCard label="Fastest build" value={formatDuration(minBuild)} icon={Zap} accent="success" />
          </div>
          <div className="lg:col-span-2">
            <BuildTimeChart data={buckets} />
          </div>
        </section>

        <section>
          <RecentDeployments items={filtered} />
        </section>
      </main>
    </div>
  );
}
