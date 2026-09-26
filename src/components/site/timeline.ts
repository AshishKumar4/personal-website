import type { Experience, Project, SceneId } from '@shared/types';

export const SCENE_TONE: Record<SceneId, string> = {
  night: '218 40% 84%',
  kernel: '38 92% 64%',
  breach: '356 84% 64%',
  signal: '188 86% 68%',
  noise: '258 90% 78%',
  swarm: '152 70% 62%',
  dawn: '26 96% 68%',
};

const DEFAULT_SCENES: Record<string, SceneId> = {
  aqeous: 'kernel',
  vit: 'breach',
  'eaf0515c-3715-4c2c-a138-38540c251a0d': 'breach',
  hyperverge: 'signal',
  dyte: 'signal',
  flaxdiff: 'noise',
  umd: 'noise',
  '17fc1af8-ce45-40aa-8f95-a1647d2d0931': 'noise',
  flydreamer: 'night',
  cloudflare: 'swarm',
  vibesdk: 'swarm',
  do86: 'kernel',
  nimbus: 'signal',
  kinu: 'swarm',
  dew: 'noise',
  'game-servers': 'signal',
};

const DEFAULT_MOTIFS: Record<string, string> = {
  'game-servers': 'servers',
  aqeous: 'boot',
  vit: 'ctf',
  'eaf0515c-3715-4c2c-a138-38540c251a0d': 'ctf',
  hyperverge: 'lab',
  dyte: 'packets',
  flaxdiff: 'denoise',
  umd: 'waveform',
  '17fc1af8-ce45-40aa-8f95-a1647d2d0931': 'waveform',
  cloudflare: 'agents',
  vibesdk: 'build',
  flydreamer: 'drone',
  do86: 'emulator',
  kinu: 'workspaces',
  nimbus: 'clouds',
  dew: 'dew',
};

export function entryMotif(id: string): string | undefined {
  const key = id.trim().toLowerCase();
  if (DEFAULT_MOTIFS[key]) return DEFAULT_MOTIFS[key];
  if (key.startsWith('vit')) return 'ctf';
  return DEFAULT_MOTIFS[key.split(/[-/]/).pop() ?? ''];
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export type TimelineEntry =
  | { kind: 'experience'; id: string; start: number | null; scene: SceneId; item: Experience }
  | { kind: 'project'; id: string; start: number | null; scene: SceneId; item: Project };

function defaultScene(id: string, fallback: SceneId): SceneId {
  const key = id.trim().toLowerCase();
  if (DEFAULT_SCENES[key]) return DEFAULT_SCENES[key];
  if (key.startsWith('vit')) return 'breach';
  const tail = key.split(/[-/]/).pop() ?? '';
  return DEFAULT_SCENES[tail] ?? fallback;
}

export function experienceStart(duration: string): number | null {
  const m = duration.match(/([A-Za-z]{3})[a-z]*\.?\s+((?:19|20)\d{2})/);
  if (m) {
    const month = MONTHS.indexOf(m[1].toLowerCase());
    return Number(m[2]) + (month >= 0 ? month / 12 : 0);
  }
  const y = duration.match(/(19|20)\d{2}/);
  return y ? Number(y[0]) : null;
}

export function projectStart(year?: string): number | null {
  const m = year?.trim().match(/^((?:19|20)\d{2})(?:-(\d{1,2}))?/);
  if (!m) return null;
  return Number(m[1]) + (m[2] ? (Number(m[2]) - 1) / 12 : 0);
}

export function buildTimeline(experiences: Experience[], projects: Project[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...experiences.map(e => ({ kind: 'experience' as const, id: e.id, start: experienceStart(e.duration), scene: e.scene ?? defaultScene(e.id, 'signal'), item: e })),
    ...projects.map(p => ({ kind: 'project' as const, id: p.id, start: projectStart(p.year), scene: p.scene ?? defaultScene(p.id, 'swarm'), item: p })),
  ];
  const dated = entries.filter(e => e.start !== null).sort((a, b) => (a.start! - b.start!) || (a.kind === b.kind ? 0 : a.kind === 'experience' ? -1 : 1));
  return [...dated, ...entries.filter(e => e.start === null)];
}

export function projectHue(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export function entryTitle(e: TimelineEntry): string {
  return e.kind === 'experience' ? e.item.company : e.item.name;
}
