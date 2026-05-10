import { FormEvent, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, GitBranch, Plug, RefreshCw, Server, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Deployment } from "@/lib/deployments";
import {
  GitHubActionsConnection,
  IntegrationConnection,
  JenkinsConnection,
  importDeployments,
} from "@/lib/integrations";

type Props = {
  connection?: IntegrationConnection;
  importedCount: number;
  lastSyncedAt?: string;
  onImported: (connection: IntegrationConnection, deployments: Deployment[]) => void;
  onClear: () => void;
};

const environments: Deployment["environment"][] = ["production", "staging", "development"];

export function IntegrationPanel({ connection, importedCount, lastSyncedAt, onImported, onClear }: Props) {
  const [provider, setProvider] = useState<IntegrationConnection["provider"]>(connection?.provider ?? "github-actions");
  const [github, setGithub] = useState<GitHubActionsConnection>({
    provider: "github-actions",
    owner: connection?.provider === "github-actions" ? connection.owner : "",
    repo: connection?.provider === "github-actions" ? connection.repo : "",
    token: connection?.provider === "github-actions" ? connection.token ?? "" : "",
    workflowFilter: connection?.provider === "github-actions" ? connection.workflowFilter ?? "deploy" : "deploy",
    environment: connection?.provider === "github-actions" ? connection.environment : "production",
  });
  const [jenkins, setJenkins] = useState<JenkinsConnection>({
    provider: "jenkins",
    baseUrl: connection?.provider === "jenkins" ? connection.baseUrl : "",
    username: connection?.provider === "jenkins" ? connection.username ?? "" : "",
    apiToken: connection?.provider === "jenkins" ? connection.apiToken ?? "" : "",
    environment: connection?.provider === "jenkins" ? connection.environment : "production",
  });
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string }>();

  const activeConnection = useMemo(() => (provider === "github-actions" ? github : jenkins), [provider, github, jenkins]);
  const connectedLabel = connection?.provider === "github-actions"
    ? `${connection.owner}/${connection.repo}`
    : connection?.provider === "jenkins"
      ? connection.baseUrl
      : "Mock data";

  async function handleImport(event: FormEvent) {
    event.preventDefault();
    setIsImporting(true);
    setMessage(undefined);

    try {
      const imported = await importDeployments(activeConnection);
      onImported(activeConnection, imported);
      setMessage({ type: "success", text: `Imported ${imported.length} deployments from ${provider === "github-actions" ? "GitHub Actions" : "Jenkins"}.` });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Import failed. Check the connection details and try again.",
      });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Card className="border-border/50 bg-gradient-card shadow-card">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plug className="h-5 w-5 text-primary" />
            Deployment source
          </CardTitle>
          <CardDescription>Connect CI/CD history and import completed deployment runs into the dashboard.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={connection ? "default" : "outline"}>{connection ? connectedLabel : "Using sample data"}</Badge>
          {lastSyncedAt && <span className="text-xs text-muted-foreground">Synced {new Date(lastSyncedAt).toLocaleString()}</span>}
          {connection && (
            <Button variant="outline" size="sm" onClick={onClear}>
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={provider} onValueChange={(value) => setProvider(value as IntegrationConnection["provider"])}>
          <TabsList>
            <TabsTrigger value="github-actions">
              <GitBranch className="mr-2 h-4 w-4" />
              GitHub Actions
            </TabsTrigger>
            <TabsTrigger value="jenkins">
              <Server className="mr-2 h-4 w-4" />
              Jenkins
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleImport}>
            <TabsContent value="github-actions" className="grid gap-4 pt-2 md:grid-cols-4">
              <Field label="Owner">
                <Input value={github.owner} onChange={(event) => setGithub({ ...github, owner: event.target.value })} placeholder="acme" required />
              </Field>
              <Field label="Repository">
                <Input value={github.repo} onChange={(event) => setGithub({ ...github, repo: event.target.value })} placeholder="web-app" required />
              </Field>
              <Field label="Workflow contains">
                <Input value={github.workflowFilter} onChange={(event) => setGithub({ ...github, workflowFilter: event.target.value })} placeholder="deploy" />
              </Field>
              <EnvironmentSelect value={github.environment} onChange={(environment) => setGithub({ ...github, environment })} />
              <div className="md:col-span-3">
                <Field label="GitHub token">
                  <Input value={github.token} onChange={(event) => setGithub({ ...github, token: event.target.value })} type="password" placeholder="Fine-grained token with Actions read access" required />
                </Field>
              </div>
            </TabsContent>

            <TabsContent value="jenkins" className="grid gap-4 pt-2 md:grid-cols-4">
              <div className="md:col-span-3">
                <Field label="Jenkins URL">
                  <Input value={jenkins.baseUrl} onChange={(event) => setJenkins({ ...jenkins, baseUrl: event.target.value })} placeholder="http://localhost:8080 or https://jenkins.example.com/view/all/builds" required />
                </Field>
              </div>
              <EnvironmentSelect value={jenkins.environment} onChange={(environment) => setJenkins({ ...jenkins, environment })} />
              <Field label="Username">
                <Input value={jenkins.username} onChange={(event) => setJenkins({ ...jenkins, username: event.target.value })} placeholder="Optional" />
              </Field>
              <Field label="API token">
                <Input value={jenkins.apiToken} onChange={(event) => setJenkins({ ...jenkins, apiToken: event.target.value })} type="password" placeholder="Optional" />
              </Field>
            </TabsContent>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isImporting}>
                <RefreshCw className={isImporting ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                {isImporting ? "Importing" : "Authorize and import"}
              </Button>
              <span className="text-sm text-muted-foreground">
                {importedCount ? `${importedCount} imported deployments are included in the metrics.` : "Sample data remains visible until a source imports records."}
              </span>
            </div>
          </form>
        </Tabs>

        {message && (
          <Alert variant={message.type === "error" ? "destructive" : "default"}>
            {message.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-success" />}
            <AlertTitle>{message.type === "error" ? "Connection failed" : "Import complete"}</AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EnvironmentSelect({ value, onChange }: { value: Deployment["environment"]; onChange: (value: Deployment["environment"]) => void }) {
  return (
    <Field label="Environment">
      <Select value={value} onValueChange={(environment) => onChange(environment as Deployment["environment"])}>
        <SelectTrigger>
          <SelectValue placeholder="Environment" />
        </SelectTrigger>
        <SelectContent>
          {environments.map((environment) => (
            <SelectItem key={environment} value={environment}>
              {environment}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
