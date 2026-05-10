export type Deployment = {
  id: string;
  user: string;
  project: string;
  environment: "production" | "staging" | "development";
  date: Date;
  buildTimeSec: number;
  status: "success" | "failed";
  source?: "mock" | "github-actions" | "jenkins";
  externalUrl?: string;
};

const users = ["Ava Chen", "Liam Patel", "Noah Kim", "Mia Garcia", "Ethan Brown", "Zoe Müller", "Aria Singh", "Owen Nakamura"];
const projects = ["web-app", "api-gateway", "mobile-ios", "mobile-android", "data-pipeline", "marketing-site"];
const environments: Deployment["environment"][] = ["production", "staging", "development"];

// Seeded RNG for stable mock data
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

function generate(): Deployment[] {
  const out: Deployment[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = 90;
  let id = 1;
  for (let d = days - 1; d >= 0; d--) {
    const base = new Date(today);
    base.setDate(base.getDate() - d);
    const dow = base.getDay();
    const weekendFactor = dow === 0 || dow === 6 ? 0.3 : 1;
    const count = Math.max(0, Math.round((4 + rand() * 12) * weekendFactor));
    for (let i = 0; i < count; i++) {
      const date = new Date(base);
      date.setHours(Math.floor(rand() * 24), Math.floor(rand() * 60));
      const buildTimeSec = Math.round(30 + rand() * 540 + (rand() < 0.05 ? 600 : 0));
      out.push({
        id: `dep_${id++}`,
        user: pick(users),
        project: pick(projects),
        environment: pick(environments),
        date,
        buildTimeSec,
        status: rand() < 0.92 ? "success" : "failed",
        source: "mock",
      });
    }
  }
  return out;
}

export const deployments = generate();
export const allUsers = users;
export const allProjects = projects;
export const allEnvironments = environments;

export function median(values: number[]) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function formatDuration(sec: number) {
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}
