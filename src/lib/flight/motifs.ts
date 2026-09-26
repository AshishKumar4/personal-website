import type { SceneId } from '@shared/types';
import type { SceneParams } from './scenes';
import { smoothstep } from './math';

export const MOTIF_IDS = ['boot', 'ctf', 'lab', 'packets', 'denoise', 'waveform', 'agents', 'build', 'drone', 'emulator', 'workspaces', 'clouds', 'dew', 'fog'] as const;
export type MotifId = typeof MOTIF_IDS[number];

export const M = Object.fromEntries(MOTIF_IDS.map((id, i) => [id, i + 1])) as Record<MotifId, number>;

export const MOTIF_SCENE: Record<MotifId, SceneId> = {
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
  fog: 'night',
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

export const MOTIF_PROGRESS: Partial<Record<MotifId, number>> = { denoise: 0.45, build: 0.55, dew: 0.6 };

const WORLDS: Record<MotifId, Partial<SceneParams>> = {
  boot: { scanlines: 0.55 },
  ctf: {
    line: [0.38, 0.39, 0.44],
    lineFar: [0.5, 0.2, 0.24],
    farMix: 0.6,
    lineGain: 0.85,
    fill: [0.016, 0.012, 0.016],
    skyTop: [0.006, 0.004, 0.006],
    skyHorizon: [0.028, 0.01, 0.014],
    glow: [1, 0.12, 0.14],
    glowAmt: 0.05,
    rimAmt: 1.3,
    stars: 0.35,
    clouds: 0.2,
    mist: 0.3,
    amp: 1.22,
  },
  lab: {
    line: [0.72, 0.93, 0.96],
    lineFar: [0.7, 0.86, 0.98],
    farMix: 0.35,
    lineGain: 1.45,
    fill: [0.008, 0.018, 0.026],
    skyTop: [0.003, 0.007, 0.014],
    skyHorizon: [0.034, 0.078, 0.105],
    glow: [0.45, 0.8, 1],
    glowAmt: 0.22,
    rim: [0.75, 0.95, 1],
    rimAmt: 0.55,
    lantern: [0.6, 0.95, 1],
    stars: 0.8,
    moon: 0,
    clouds: 0.1,
    mist: 0.18,
    amp: 1.1,
    water: 1,
    altitude: -130,
    lookUp: 112,
    fov: 0,
    speed: 0.7,
  },
  packets: {
    line: [0.5, 0.58, 0.95],
    lineFar: [0.62, 0.64, 1],
    farMix: 0.3,
    lineGain: 0.7,
    fill: [0.012, 0.014, 0.038],
    skyTop: [0.004, 0.005, 0.018],
    skyHorizon: [0.03, 0.035, 0.09],
    glow: [0.45, 0.5, 1],
    glowAmt: 0.12,
    rim: [0.6, 0.7, 1],
    rimAmt: 0.2,
    lantern: [0.7, 0.78, 1],
    stars: 1,
    clouds: 0.25,
    mist: 0.3,
    amp: 1.1,
    plain: 1,
    altitude: -125,
    lookUp: 150,
    fov: 4,
    speed: 1.2,
  },
  denoise: { clouds: 0.3, glowAmt: 0.14 },
  waveform: {
    line: [0.9, 0.7, 0.8],
    lineFar: [1, 0.6, 0.5],
    farMix: 0.5,
    lineGain: 0.8,
    fill: [0.03, 0.018, 0.03],
    skyTop: [0.012, 0.01, 0.03],
    skyHorizon: [0.14, 0.06, 0.07],
    glow: [1, 0.45, 0.35],
    glowAmt: 0.22,
    rim: [1, 0.7, 0.6],
    rimAmt: 0.3,
    lantern: [1, 0.8, 0.7],
    stars: 0.35,
    clouds: 0.6,
    mist: 0.4,
    jitter: 0,
    hills: 1,
    altitude: -70,
    lookUp: 60,
    fov: 0,
    speed: 0.8,
  },
  agents: {
    line: [0.62, 0.68, 0.78],
    lineFar: [0.8, 0.7, 0.62],
    farMix: 0.4,
    fill: [0.02, 0.022, 0.03],
    skyTop: [0.004, 0.006, 0.012],
    skyHorizon: [0.03, 0.03, 0.04],
    glow: [1, 0.55, 0.3],
    glowAmt: 0.05,
    lineGain: 1,
    rim: [0.8, 0.85, 1],
    rimAmt: 0.3,
    clouds: 0.15,
    mist: 0,
    amp: 1.3,
    cloud: 1,
    altitude: 110,
    lookUp: 30,
    fov: 2,
  },
  build: {
    line: [0.62, 0.78, 1],
    lineFar: [0.5, 0.7, 1],
    farMix: 0.3,
    lineGain: 0.8,
    fill: [0.01, 0.02, 0.045],
    skyTop: [0.003, 0.006, 0.016],
    skyHorizon: [0.02, 0.04, 0.08],
    glow: [0.4, 0.6, 1],
    glowAmt: 0.12,
    rim: [0.7, 0.85, 1],
    rimAmt: 0.2,
    clouds: 0.1,
    mist: 0.15,
    amp: 0.8,
    build: 1,
    altitude: 60,
    lookUp: 6,
  },
  drone: {},
  emulator: {
    line: [0.72, 0.9, 1],
    lineFar: [0.5, 0.8, 1],
    farMix: 0.5,
    lineGain: 0.95,
    fill: [0.012, 0.02, 0.028],
    skyTop: [0.004, 0.007, 0.012],
    skyHorizon: [0.03, 0.05, 0.07],
    glow: [0.5, 0.85, 1],
    glowAmt: 0.18,
    rim: [0.7, 0.95, 1],
    rimAmt: 0.22,
    lantern: [0.7, 0.95, 1],
    stars: 0.3,
    scanlines: 0.5,
  },
  workspaces: {
    line: [0.45, 0.58, 0.85],
    lineFar: [0.5, 0.6, 0.9],
    farMix: 0.3,
    lineGain: 0.7,
    fill: [0.01, 0.016, 0.04],
    skyTop: [0.003, 0.005, 0.016],
    skyHorizon: [0.02, 0.03, 0.075],
    glow: [0.35, 0.5, 1],
    glowAmt: 0.1,
    mist: 1.1,
    fog: 0.3,
    amp: 0.95,
    altitude: 20,
    lookUp: 0,
  },
  clouds: {
    line: [1, 0.8, 0.68],
    lineFar: [0.92, 0.62, 0.68],
    farMix: 0.55,
    lineGain: 0.82,
    fill: [0.014, 0.015, 0.024],
    skyTop: [0.004, 0.006, 0.014],
    skyHorizon: [0.028, 0.038, 0.062],
    glow: [1, 0.6, 0.62],
    glowAmt: 0.05,
    rim: [1, 0.55, 0.6],
    rimAmt: 0.95,
    lantern: [1, 0.85, 0.8],
    stars: 0.7,
    clouds: 0.25,
    mist: 0,
    fog: 0.42,
    mesa: 1,
    bank: 1,
    terrace: 0.22,
    terraceStep: 22,
    altitude: 25,
    lookUp: 30,
    speed: 0.9,
  },
  dew: {
    line: [0.62, 0.7, 0.92],
    lineFar: [0.95, 0.7, 0.6],
    farMix: 0.45,
    lineGain: 0.85,
    fill: [0.018, 0.022, 0.045],
    skyTop: [0.004, 0.008, 0.028],
    skyHorizon: [0.04, 0.058, 0.125],
    glow: [1, 0.62, 0.42],
    glowAmt: 0.06,
    band: 0.3,
    rim: [0.8, 0.85, 1],
    rimAmt: 0.2,
    lantern: [0.8, 0.85, 1],
    stars: 0.5,
    clouds: 0.35,
    mist: 1.7,
    fog: 0.3,
    jitter: 0,
    altitude: -20,
    lookUp: 70,
    speed: 0.8,
  },
  fog: {
    plain: 0.85,
    mist: 1.2,
    clouds: 0.4,
    jitter: 0,
    altitude: -100,
    lookUp: 110,
    speed: 0.7,
  },
};

export function applyMotif(p: SceneParams, motif: MotifId | null, progress: number): SceneParams {
  if (!motif) return p;
  const o = { ...p, ...WORLDS[motif] };
  switch (motif) {
    case 'denoise':
      o.jitter = 1 - smoothstep(0, 0.85, progress);
      break;
    case 'build':
      o.rise = smoothstep(0.05, 0.85, progress);
      o.fireflies = Math.max(o.fireflies, 0.85);
      break;
    case 'agents':
    case 'workspaces':
      o.fireflies = Math.max(o.fireflies, 0.85);
      break;
  }
  return o;
}
