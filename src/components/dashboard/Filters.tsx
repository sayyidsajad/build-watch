import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { Deployment } from "@/lib/deployments";

export type RangePreset = "7d" | "30d" | "90d" | "custom";

type Props = {
  preset: RangePreset;
  onPreset: (p: RangePreset) => void;
  customRange?: DateRange;
  onCustomRange: (r: DateRange | undefined) => void;
  project: string;
  onProject: (v: string) => void;
  environment: string;
  onEnvironment: (v: string) => void;
  projects: string[];
  environments: Deployment["environment"][];
};

const presets: { id: RangePreset; label: string }[] = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "custom", label: "Custom" },
];

export function Filters({
  preset, onPreset, customRange, onCustomRange, project, onProject, environment, onEnvironment, projects, environments,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/50 bg-card p-3 shadow-sm">
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        {presets.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant="ghost"
            onClick={() => onPreset(p.id)}
            className={cn(
              "h-8 rounded-md px-3 text-sm",
              preset === p.id && "bg-background text-foreground shadow-sm"
            )}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {preset === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {customRange?.from ? (
                customRange.to ? (
                  <>{format(customRange.from, "LLL d")} – {format(customRange.to, "LLL d")}</>
                ) : (
                  format(customRange.from, "LLL d, y")
                )
              ) : (
                "Pick range"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={customRange}
              onSelect={onCustomRange}
              numberOfMonths={2}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      )}

      <div className="ml-auto flex flex-wrap gap-2">
        <Select value={project} onValueChange={onProject}>
          <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={environment} onValueChange={onEnvironment}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Environment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All environments</SelectItem>
            {environments.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
