import { Deployment } from "@/lib/deployments";

export type Provider = "github-actions" | "jenkins";

export type GitHubActionsConnection = {
  provider: "github-actions";
  owner: string;
  repo: string;
  token: string;
  workflowFilter?: string;
  environment: Deployment["environment"];
};

export type JenkinsConnection = {
  provider: "jenkins";
  baseUrl: string;
  username?: string;
  apiToken?: string;
  environment: Deployment["environment"];
};

export type IntegrationConnection = GitHubActionsConnection | JenkinsConnection;

export type IntegrationState = {
  connection?: IntegrationConnection;
  deployments: Deployment[];
  lastSyncedAt?: string;
};

const storageKey = "deployment-analytics.integration";
const jenkinsRequestTimeoutMs = 15_000;
const jenkinsMaxJobs = 200;
const jenkinsBuildsPerJob = 50;
const jenkinsBatchSize = 8;

type StoredDeployment = Omit<Deployment, "date"> & { date: string };

export function loadIntegrationState(): IntegrationState {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { deployments: [] };
    const parsed = JSON.parse(raw) as Omit<IntegrationState, "deployments"> & { deployments?: StoredDeployment[] };
    return {
      ...parsed,
      deployments: (parsed.deployments ?? []).map((deployment) => ({
        ...deployment,
        date: new Date(deployment.date),
      })),
    };
  } catch {
    return { deployments: [] };
  }
}

export function saveIntegrationState(state: IntegrationState) {
  const connection = state.connection ? withoutSecrets(state.connection) : undefined;
  const serializable = {
    ...state,
    connection,
    deployments: state.deployments.map((deployment) => ({
      ...deployment,
      date: deployment.date.toISOString(),
    })),
  };
  localStorage.setItem(storageKey, JSON.stringify(serializable));
}

function withoutSecrets(connection: IntegrationConnection): IntegrationConnection {
  if (connection.provider === "github-actions") {
    return { ...connection, token: "" };
  }
  return { ...connection, apiToken: "" };
}

export function clearIntegrationState() {
  localStorage.removeItem(storageKey);
}

export async function importDeployments(connection: IntegrationConnection): Promise<Deployment[]> {
  if (connection.provider === "github-actions") {
    return importGitHubActionsDeployments(connection);
  }
  return importJenkinsDeployments(connection);
}

type GitHubWorkflowRun = {
  id: number;
  name?: string;
  display_title?: string;
  run_started_at?: string;
  updated_at?: string;
  created_at?: string;
  conclusion?: "success" | "failure" | "cancelled" | "timed_out" | "action_required" | "neutral" | "skipped" | null;
  status?: string;
  html_url?: string;
  actor?: { login?: string };
  head_branch?: string;
  repository?: { name?: string };
};

async function importGitHubActionsDeployments(connection: GitHubActionsConnection): Promise<Deployment[]> {
  const params = new URLSearchParams({ per_page: "100" });
  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(connection.owner)}/${encodeURIComponent(connection.repo)}/actions/runs?${params}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${connection.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`GitHub Actions import failed: ${response.status} ${response.statusText}`);
  }

  const body = (await response.json()) as { workflow_runs?: GitHubWorkflowRun[] };
  const filter = connection.workflowFilter?.trim().toLowerCase();

  return (body.workflow_runs ?? [])
    .filter((run) => run.status === "completed")
    .filter((run) => !filter || `${run.name ?? ""} ${run.display_title ?? ""}`.toLowerCase().includes(filter))
    .map((run) => {
      const startedAt = new Date(run.run_started_at ?? run.created_at ?? Date.now());
      const finishedAt = new Date(run.updated_at ?? startedAt);
      const buildTimeSec = Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000));
      return {
        id: `github-actions_${run.id}`,
        user: run.actor?.login ?? "github-actions",
        project: run.repository?.name ?? connection.repo,
        environment: connection.environment,
        date: finishedAt,
        buildTimeSec,
        status: run.conclusion === "success" ? "success" : "failed",
        source: "github-actions",
        externalUrl: run.html_url,
      };
    });
}

type JenkinsBuild = {
  number: number;
  result?: "SUCCESS" | "FAILURE" | "ABORTED" | "UNSTABLE" | null;
  timestamp: number;
  duration: number;
  fullDisplayName?: string;
  url?: string;
  building?: boolean;
  actions?: Array<{ causes?: Array<{ userName?: string; shortDescription?: string }> }>;
};

type JenkinsJob = {
  name: string;
  fullName?: string;
  url: string;
  color?: string;
  jobs?: JenkinsJob[];
  builds?: JenkinsBuild[];
};

type JenkinsJobDetails = JenkinsJob & {
  builds?: JenkinsBuild[];
};

async function importJenkinsDeployments(connection: JenkinsConnection): Promise<Deployment[]> {
  const headers = getJenkinsHeaders(connection);
  const seedJobs = await discoverJenkinsJobs(connection, headers);
  const visited = new Set<string>();
  const queue = [...seedJobs];
  const deployments: Deployment[] = [];
  let failedJobs = 0;

  while (queue.length && visited.size < jenkinsMaxJobs) {
    const batch = queue.splice(0, jenkinsBatchSize);
    const results = await Promise.allSettled(batch.map((job) => fetchJenkinsJobDetails(job.url, headers, visited)));

    results.forEach((result) => {
      if (result.status === "rejected") {
        failedJobs += 1;
        return;
      }

      const job = result.value;
      if (!job) return;

      deployments.push(...flattenJenkinsJobBuilds(job, connection.environment));
      queue.push(...(job.jobs ?? []));
    });
  }

  if (!deployments.length && failedJobs > 0) {
    throw new Error("Jenkins discovery found jobs, but build imports failed. Check credentials and Jenkins API access.");
  }

  return deployments.sort((a, b) => b.date.getTime() - a.date.getTime());
}

function getJenkinsHeaders(connection: JenkinsConnection): HeadersInit {
  const headers: HeadersInit = { Accept: "application/json" };

  if (connection.username && connection.apiToken) {
    headers.Authorization = `Basic ${btoa(`${connection.username}:${connection.apiToken}`)}`;
  }

  return headers;
}

async function discoverJenkinsJobs(connection: JenkinsConnection, headers: HeadersInit): Promise<JenkinsJob[]> {
  const urls = getJenkinsDiscoveryUrls(connection.baseUrl);
  let lastError: Error | undefined;

  for (const url of urls) {
    try {
      const params = new URLSearchParams({ tree: "jobs[name,fullName,url,color]" });
      const response = await fetchJenkinsApi(`${url}?${params}`, headers);
      if (!response.ok) {
        lastError = new Error(`Jenkins discovery failed at ${url}: ${response.status} ${response.statusText}`);
        continue;
      }

      const body = (await response.json()) as { jobs?: JenkinsJob[] };
      if (body.jobs?.length) return body.jobs;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Jenkins discovery failed.");
    }
  }

  throw lastError ?? new Error("No Jenkins jobs were found from the provided URL.");
}

function getJenkinsDiscoveryUrls(rawUrl: string): string[] {
  const parsed = new URL(rawUrl.match(/^https?:\/\//i) ? rawUrl : `http://${rawUrl}`);
  const cleanPath = parsed.pathname
    .replace(/\/builds\/?$/, "")
    .replace(/\/api\/json\/?$/, "")
    .replace(/\/$/, "");

  const base = `${parsed.origin}${cleanPath}`;
  const contextPath = cleanPath.split("/view/")[0].replace(/\/$/, "");
  const contextRoot = `${parsed.origin}${contextPath}`;

  return Array.from(new Set([
    `${base}/api/json`,
    `${contextRoot}/view/all/api/json`,
    `${contextRoot}/api/json`,
  ]));
}

function flattenJenkinsJobBuilds(job: JenkinsJobDetails | undefined, environment: Deployment["environment"]): Deployment[] {
  if (!job) return [];

  const builds = (job.builds ?? [])
    .filter((build) => !build.building && build.result)
    .map((build) => normalizeJenkinsBuild(job, build, environment));

  return builds;
}

function normalizeJenkinsBuild(job: JenkinsJobDetails, build: JenkinsBuild, environment: Deployment["environment"]): Deployment {
  const cause = build.actions?.flatMap((action) => action.causes ?? [])[0];
  const project = inferProjectName(job);

  return {
    id: `jenkins_${job.fullName ?? job.name}_${build.number}`,
    user: cause?.userName ?? cause?.shortDescription ?? "jenkins",
    project,
    environment,
    date: new Date(build.timestamp + build.duration),
    buildTimeSec: Math.max(0, Math.round(build.duration / 1000)),
    status: build.result === "SUCCESS" ? "success" : "failed",
    source: "jenkins",
    externalUrl: build.url,
  };
}

function inferProjectName(job: JenkinsJobDetails) {
  const name = job.fullName ?? job.name;
  const parts = name.split(/[/»]/).map((part) => part.trim()).filter(Boolean);
  const leaf = parts[parts.length - 1] ?? name;

  return leaf
    .replace(/\b(deploy|deployment|release|promote)\b/gi, "")
    .replace(/\b(prod|production|stage|staging|dev|development)\b/gi, "")
    .replace(/[-_\s]+$/g, "")
    .replace(/^[-_\s]+/g, "")
    || leaf;
}

async function fetchJenkinsJobDetails(jobUrl: string, headers: HeadersInit, visited: Set<string>): Promise<JenkinsJobDetails | undefined> {
  const normalizedUrl = jobUrl.replace(/\/$/, "");
  if (visited.has(normalizedUrl)) return undefined;
  visited.add(normalizedUrl);

  const tree = [
    "name",
    "fullName",
    "url",
    "color",
    "jobs[name,fullName,url,color]",
    `builds[number,result,timestamp,duration,fullDisplayName,url,building,actions[causes[userName,shortDescription]]]{0,${jenkinsBuildsPerJob}}`,
  ].join(",");

  const params = new URLSearchParams({ tree });
  const response = await fetchJenkinsApi(`${normalizedUrl}/api/json?${params}`, headers);
  if (!response.ok) {
    throw new Error(`Jenkins job import failed at ${normalizedUrl}: ${response.status} ${response.statusText}`);
  }

  const job = (await response.json()) as JenkinsJobDetails;
  return job;
}

function fetchJenkinsApi(url: string, headers: HeadersInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), jenkinsRequestTimeoutMs);
  const options = { headers, signal: controller.signal };

  return fetch(`/api/jenkins-proxy?url=${encodeURIComponent(url)}`, options).finally(() => window.clearTimeout(timeout));
}
