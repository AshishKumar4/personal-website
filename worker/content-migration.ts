import type { Project } from "@shared/types";

export const SEED_PROJECTS: Project[] = [
  {
    id: "kinu",
    name: "Kinu",
    description: "An agent platform that keeps working while you are away. Persistent, self-evolving agents with their own computers run research swarms, build live apps and work in real Linux sandboxes, on Cloudflare Durable Objects or locally with Bun.",
    repo: "AshishKumar4/kinu",
    url: "https://github.com/AshishKumar4/kinu",
    order: 1,
    year: "2026-04",
  },
  {
    id: "cloudflare-vibesdk",
    name: "Cloudflare VibeSDK",
    description: "An open-source text-to-app platform built on Cloudflare's developer ecosystem: users generate, deploy and iterate on full-stack apps using natural language. I created it and was its primary author; 5K+ GitHub stars.",
    repo: "cloudflare/vibesdk",
    url: "https://github.com/cloudflare/vibesdk",
    order: 2,
    year: "2025-08",
  },
  {
    id: "dew",
    name: "Dew",
    description: "A JAX/Flax framework for training language models (pretraining, SFT, DPO and GRPO), diffusion models (rectified flow, latent and video diffusion) and I-JEPA/V-JEPA encoders, with FSDP, expert, tensor and sequence parallelism. It grew out of FlaxDiff.",
    repo: "AshishKumar4/dew",
    url: "https://github.com/AshishKumar4/dew",
    order: 3,
    year: "2026-09",
  },
  {
    id: "do86",
    name: "do86",
    description: "x86 operating systems running inside a Cloudflare Durable Object, with demand-paged guest memory backed by SQLite. Boots my own Aqeous OS in the cloud, on the edge.",
    repo: "AshishKumar4/do86",
    url: "https://github.com/AshishKumar4/do86",
    order: 4,
    year: "2026-03",
  },
  {
    id: "nimbus",
    name: "Nimbus",
    description: "Free POSIX-like sandboxes on Cloudflare Durable Objects: a WASI runtime, a demand-paged SQLite-backed virtual file system, and Python, Ruby and C/Clang WASM runtimes running inside isolated sandboxes at the edge.",
    repo: "AshishKumar4/Nimbus",
    url: "https://github.com/AshishKumar4/Nimbus",
    order: 5,
    year: "2026-04",
  },
  {
    id: "ashishkumar4-flaxdiff",
    name: "FlaxDiff",
    description: "A JAX/Flax-based diffusion library replicating 17+ techniques. Trained 100M-parameter models on 250M+ images using 128 TPUv4s.",
    repo: "AshishKumar4/FlaxDiff",
    url: "https://github.com/AshishKumar4/FlaxDiff",
    order: 6,
    year: "2024-06",
  },
  {
    id: "flydreamer",
    name: "FlyDreamer",
    description: "Teaching a DreamerV3 world-model agent to fly FPV drones from vision alone: custom simulation environments, reward shaping and a transformer state-space dynamics variant.",
    repo: "AshishKumar4/FlyDreamer",
    url: "https://github.com/AshishKumar4/FlyDreamer",
    order: 7,
    year: "2025-10",
  },
  {
    id: "ashishkumar4-aqeous",
    name: "Aqeous OS",
    description: "An operating system and kernel I wrote from scratch in high school, in C and x86 assembly: SMP multiprocessing, AHCI, ELF loading, a custom filesystem and a compositing GUI. Listed on the OSDev wiki.",
    repo: "AshishKumar4/Aqeous",
    url: "https://github.com/AshishKumar4/Aqeous",
    order: 8,
    year: "2015-12",
  },
];

export interface ProjectsMigrationSpec {
  id: string;
  remove: string[];
  add: Project[];
  order: Record<string, number>;
  year: Record<string, string>;
}

const seedById = new Map(SEED_PROJECTS.map((p) => [p.id, p]));

export const PROJECTS_MIGRATION: ProjectsMigrationSpec = {
  id: "2026-09-projects-v4",
  remove: ["mossaic", "ashishkumar4-cf-git"],
  add: ["kinu", "dew"].map((id) => seedById.get(id)!),
  order: Object.fromEntries(SEED_PROJECTS.map((p) => [p.id, p.order!])),
  year: Object.fromEntries(SEED_PROJECTS.filter((p) => p.year).map((p) => [p.id, p.year!])),
};

export interface ProjectsMigrationPlan {
  deleteIds: string[];
  add: Project[];
  orders: { id: string; order: number }[];
  years: { id: string; year: string }[];
}

export function planProjectsMigration(existing: Project[], spec: ProjectsMigrationSpec): ProjectsMigrationPlan {
  const live = existing.filter((p) => p.id && p.name);
  const byId = new Map(live.map((p) => [p.id, p]));
  const removed = new Set(spec.remove);
  const indexed = new Set(existing.map((p) => p.id));
  const deleteIds = spec.remove.filter((id) => indexed.has(id));
  const add = spec.add.filter((p) => !byId.has(p.id) && !removed.has(p.id));
  const orders = Object.entries(spec.order)
    .filter(([id]) => !removed.has(id))
    .flatMap(([id, order]) => {
      const current = byId.get(id);
      return current && typeof current.order !== "number" ? [{ id, order }] : [];
    });
  const years = Object.entries(spec.year)
    .filter(([id]) => !removed.has(id))
    .flatMap(([id, year]) => {
      const current = byId.get(id);
      return current && !current.year ? [{ id, year }] : [];
    });
  return { deleteIds, add, orders, years };
}

export interface MigrationMarker {
  id: string;
  status: "pending" | "running" | "done";
  claimId: string;
  claimedAt: number;
  doneAt: number;
}

export const EMPTY_MIGRATION_MARKER: MigrationMarker = { id: "", status: "pending", claimId: "", claimedAt: 0, doneAt: 0 };

export const MIGRATION_LEASE_MS = 60_000;

export function claimMarker(current: MigrationMarker, claimId: string, now: number, leaseMs = MIGRATION_LEASE_MS): MigrationMarker {
  if (current.status === "done") return current;
  if (current.status === "running" && now - current.claimedAt < leaseMs) return current;
  return { ...current, status: "running", claimId, claimedAt: now };
}

export function finishMarker(current: MigrationMarker, now: number): MigrationMarker {
  if (current.status === "done") return current;
  return { ...current, status: "done", doneAt: now };
}

export interface ProjectsMigrationStore {
  readMarker(): Promise<MigrationMarker>;
  updateMarker(fn: (current: MigrationMarker) => MigrationMarker): Promise<MigrationMarker>;
  listProjects(): Promise<Project[]>;
  deleteProject(id: string): Promise<void>;
  addProjectIfAbsent(project: Project): Promise<void>;
  setOrderIfUnset(id: string, order: number): Promise<void>;
  setYearIfUnset(id: string, year: string): Promise<void>;
}

export type MigrationOutcome = "already-done" | "applied" | "busy";

export async function runProjectsMigration(
  store: ProjectsMigrationStore,
  spec: ProjectsMigrationSpec = PROJECTS_MIGRATION,
  now: () => number = Date.now,
  newClaimId: () => string = () => crypto.randomUUID(),
): Promise<MigrationOutcome> {
  const marker = await store.readMarker();
  if (marker.status === "done") return "already-done";
  const claimId = newClaimId();
  const claimed = await store.updateMarker((current) => claimMarker(current, claimId, now()));
  if (claimed.status === "done") return "already-done";
  if (claimed.claimId !== claimId) return "busy";
  const plan = planProjectsMigration(await store.listProjects(), spec);
  for (const id of plan.deleteIds) await store.deleteProject(id);
  for (const project of plan.add) await store.addProjectIfAbsent(project);
  for (const { id, order } of plan.orders) await store.setOrderIfUnset(id, order);
  for (const { id, year } of plan.years) await store.setYearIfUnset(id, year);
  await store.updateMarker((current) => finishMarker(current, now()));
  return "applied";
}
