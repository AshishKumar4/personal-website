import type { SceneId } from '@shared/types';
import type { SceneParams, V3 } from './scenes';
import { smoothstep } from './math';

export const MOTIF_IDS = ['servers', 'boot', 'ctf', 'lab', 'packets', 'denoise', 'waveform', 'agents', 'build', 'drone', 'emulator', 'workspaces', 'clouds', 'dew'] as const;
export type MotifId = typeof MOTIF_IDS[number];

export const M = Object.fromEntries(MOTIF_IDS.map((id, i) => [id, i + 1])) as Record<MotifId, number>;

export const MOTIF_SCENE: Record<MotifId, SceneId> = {
  servers: 'signal',
  boot: 'kernel',
  ctf: 'breach',
  lab: 'signal',
  packets: 'signal',
  denoise: 'noise',
  waveform: 'noise',
  agents: 'swarm',
  build: 'swarm',
  drone: 'night',
  emulator: 'kernel',
  workspaces: 'swarm',
  clouds: 'signal',
  dew: 'noise',
};

const SET = new Set<string>(MOTIF_IDS);

export function isMotif(v: string | null | undefined): v is MotifId {
  return !!v && SET.has(v);
}

export function motifCode(id: MotifId | null): number {
  return id ? M[id] : 0;
}

export type Variation = [number, number, number, number];

export const NEUTRAL: Variation = [0, 0, 0, 0];

const fract = (x: number) => x - Math.floor(x);

export function variation(seed: number | null): Variation {
  if (seed === null || !Number.isFinite(seed)) return NEUTRAL;
  const s = fract(seed);
  const a = s * Math.PI * 2 + 0.7;
  const r = 900 + fract(s * 13.71 + 0.31) * 1700;
  return [Math.cos(a) * r, Math.sin(a) * r, fract(s * 7.31 + 0.13) * 1.3 - 0.45, fract(s * 3.17 + 0.52) * 0.6 - 0.12];
}

const tint = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const MOTIF_PROGRESS: Partial<Record<MotifId, number>> = { denoise: 0.45, waveform: 0.6, dew: 0.6 };

export function applyMotif(p: SceneParams, motif: MotifId | null, progress: number): SceneParams {
  switch (motif) {
    case 'servers':
      return { ...p, cities: p.cities * 0.4, glow: tint(p.glow, [1, 0.62, 0.32], 0.4), skyHorizon: tint(p.skyHorizon, [0.07, 0.05, 0.04], 0.35) };
    case 'packets':
      return { ...p, packets: Math.max(p.packets, 1) };
    case 'waveform':
    case 'dew':
      return { ...p, jitter: Math.min(p.jitter, 1 - smoothstep(0, 0.3, progress)) };
    case 'denoise':
      return { ...p, jitter: 1 - smoothstep(0, 0.85, progress) };
    case 'agents':
    case 'build':
    case 'workspaces':
      return { ...p, fireflies: Math.max(p.fireflies, 0.85) };
    default:
      return p;
  }
}
