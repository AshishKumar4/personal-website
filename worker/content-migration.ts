import type { Project } from "@shared/types";
import { EXPERIENCE_STORIES, PROJECT_STORIES, isReplaceableStory } from "./entry-stories";

export const SEED_PROJECTS: Project[] = [
  {
    id: "kinu",
    name: "Kinu",
    description: "An agent platform that keeps working while you are away. Persistent, self-evolving agents with their own computers run research swarms, build live apps and work in real Linux sandboxes, on Cloudflare Durable Objects or locally with Bun.",
    repo: "AshishKumar4/kinu",
    url: "https://github.com/AshishKumar4/kinu",
    homepage: "https://kinu.run",
    imageUrl: "/projects/kinu-landing.webp",
    order: 1,
    year: "2026-04",
    story: PROJECT_STORIES["kinu"],
  },
  {
    id: "cloudflare-vibesdk",
    name: "Cloudflare VibeSDK",
    description: "An open-source text-to-app platform built on Cloudflare's developer ecosystem: users generate, deploy and iterate on full-stack apps using natural language. I created it and was its primary author; 5K+ GitHub stars.",
    repo: "cloudflare/vibesdk",
    url: "https://github.com/cloudflare/vibesdk",
    homepage: "https://build.cloudflare.dev",
    order: 2,
    year: "2025-08",
    story: PROJECT_STORIES["cloudflare-vibesdk"],
  },
  {
    id: "dew",
    name: "Dew",
    description: "A JAX/Flax framework for training language models (pretraining, SFT, DPO and GRPO), diffusion models (rectified flow, latent and video diffusion) and I-JEPA/V-JEPA encoders, with FSDP, expert, tensor and sequence parallelism. It grew out of FlaxDiff.",
    repo: "AshishKumar4/dew",
    url: "https://github.com/AshishKumar4/dew",
    homepage: "https://dewml.dev",
    imageUrl: "/projects/dew.svg",
    order: 3,
    year: "2026-09",
    story: PROJECT_STORIES["dew"],
  },
  {
    id: "nimbus",
    name: "Nimbus",
    description: "Free POSIX-like sandboxes on Cloudflare Durable Objects: a WASI runtime, a demand-paged SQLite-backed virtual file system, and Python, Ruby and C/Clang WASM runtimes running inside isolated sandboxes at the edge.",
    repo: "AshishKumar4/Nimbus",
    url: "https://github.com/AshishKumar4/Nimbus",
    homepage: "https://nimbus-os.dev",
    imageUrl: "/projects/nimbus.webp",
    order: 5,
    year: "2026-04",
    story: PROJECT_STORIES["nimbus"],
  },
  {
    id: "ashishkumar4-flaxdiff",
    name: "FlaxDiff",
    description: "A JAX/Flax-based diffusion library replicating 17+ techniques. Trained 100M-parameter models on 250M+ images using 128 TPUv4s.",
    repo: "AshishKumar4/FlaxDiff",
    url: "https://github.com/AshishKumar4/FlaxDiff",
    homepage: "https://pypi.org/project/flaxdiff/",
    imageUrl: "/projects/flaxdiff.webp",
    order: 6,
    year: "2024-06",
    story: PROJECT_STORIES["ashishkumar4-flaxdiff"],
  },
  {
    id: "flydreamer",
    name: "FlyDreamer",
    description: "Teaching a DreamerV3 world-model agent to fly FPV drones from vision alone: custom simulation environments, reward shaping and a transformer state-space dynamics variant.",
    repo: "AshishKumar4/FlyDreamer",
    url: "https://github.com/AshishKumar4/FlyDreamer",
    imageUrl: "/projects/flydreamer.webp",
    videoUrl: "/projects/flydreamer.webm /projects/flydreamer.mp4",
    order: 7,
    year: "2025-10",
    story: PROJECT_STORIES["flydreamer"],
  },
  {
    id: "ashishkumar4-aqeous",
    name: "Aqeous OS",
    description: "An operating system and kernel I wrote from scratch in high school, in C and x86 assembly: SMP multiprocessing, AHCI, ELF loading, a custom filesystem and a compositing GUI. Listed on the OSDev wiki.",
    repo: "AshishKumar4/Aqeous",
    url: "https://github.com/AshishKumar4/Aqeous",
    order: 8,
    year: "2015-12",
    story: PROJECT_STORIES["ashishkumar4-aqeous"],
  },
];

export interface ProjectsMigrationSpec {
  id: string;
  remove: string[];
  add: Project[];
  order: Record<string, number>;
  year: Record<string, string>;
  story: Record<string, string>;
  experienceStory: Record<string, string>;
  fields: Record<string, Partial<Record<MigratedField, string>>>;
  retired: Record<string, Partial<Record<MigratedField, string[]>>>;
}

export type MigratedField = "homepage" | "imageUrl" | "videoUrl";

const MIGRATED_FIELDS: MigratedField[] = ["homepage", "imageUrl", "videoUrl"];

const seedById = new Map(SEED_PROJECTS.map((p) => [p.id, p]));

export const PROJECTS_MIGRATION: ProjectsMigrationSpec = {
  id: "2026-09-projects-v9",
  remove: ["mossaic", "ashishkumar4-cf-git", "game-servers", "do86"],
  add: ["kinu", "dew"].map((id) => seedById.get(id)!),
  order: Object.fromEntries(SEED_PROJECTS.map((p) => [p.id, p.order!])),
  year: Object.fromEntries(SEED_PROJECTS.filter((p) => p.year).map((p) => [p.id, p.year!])),
  story: PROJECT_STORIES,
  experienceStory: EXPERIENCE_STORIES,
  fields: Object.fromEntries(
    SEED_PROJECTS.map((p) => [p.id, Object.fromEntries(MIGRATED_FIELDS.filter((f) => p[f]).map((f) => [f, p[f]!]))]),
  ),
  retired: {
    "ashishkumar4-flaxdiff": { imageUrl: ["/api/images/images/projects/flaxdiff.jpg"] },
    nimbus: { imageUrl: ["/api/images/images/projects/nimbus.png"] },
    flydreamer: { imageUrl: ["/api/images/images/projects/flydreamer.png"] },
    kinu: { imageUrl: ["/projects/kinu.webp"] },
  },
};

export function isReplaceableField(current: string | undefined, retired: string[] = []): boolean {
  const value = current?.trim() ?? "";
  return !value || retired.includes(value);
}

export interface ProjectsMigrationPlan {
  deleteIds: string[];
  add: Project[];
  orders: { id: string; order: number }[];
  years: { id: string; year: string }[];
  stories: { id: string; story: string }[];
  fields: { id: string; field: MigratedField; value: string; retired: string[] }[];
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
  const stories = Object.entries(spec.story)
    .filter(([id]) => !removed.has(id))
    .flatMap(([id, story]) => {
      const current = byId.get(id) ?? add.find((p) => p.id === id);
      return current && isReplaceableStory(current.story) ? [{ id, story }] : [];
    });
  const fields = Object.entries(spec.fields)
    .filter(([id]) => !removed.has(id))
    .flatMap(([id, values]) => {
      const current = byId.get(id) ?? add.find((p) => p.id === id);
      if (!current) return [];
      return MIGRATED_FIELDS.flatMap((field) => {
        const value = values[field];
        const retired = spec.retired[id]?.[field] ?? [];
        return value && current[field] !== value && isReplaceableField(current[field], retired) ? [{ id, field, value, retired }] : [];
      });
    });
  return { deleteIds, add, orders, years, stories, fields };
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
  setStoryIfUnset(id: string, story: string): Promise<void>;
  setExperienceStoryIfUnset(id: string, story: string): Promise<void>;
  setFieldIfReplaceable(id: string, field: MigratedField, value: string, retired: string[]): Promise<void>;
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
  for (const { id, story } of plan.stories) await store.setStoryIfUnset(id, story);
  for (const [id, story] of Object.entries(spec.experienceStory)) await store.setExperienceStoryIfUnset(id, story);
  for (const { id, field, value, retired } of plan.fields) await store.setFieldIfReplaceable(id, field, value, retired);
  await store.updateMarker((current) => finishMarker(current, now()));
  return "applied";
}
