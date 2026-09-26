import type { SceneId } from '@shared/types';
import { clamp01, smoothstep } from './math';

export type V3 = [number, number, number];

export interface SceneParams {
  line: V3;
  lineFar: V3;
  farMix: number;
  lineGain: number;
  fill: V3;
  skyTop: V3;
  skyHorizon: V3;
  glow: V3;
  glowAmt: number;
  rim: V3;
  rimAmt: number;
  lantern: V3;
  lanternAmt: number;
  particle: V3;
  stars: number;
  moon: number;
  amp: number;
  terrace: number;
  terraceStep: number;
  jitter: number;
  packets: number;
  cities: number;
  fireflies: number;
  aurora: number;
  glitch: number;
  scanlines: number;
  sun: number;
  altitude: number;
  lookUp: number;
  fog: number;
  veil: number;
  speed: number;
  bloom: number;
  exposure: number;
}

const NIGHT: SceneParams = {
  line: [0.64, 0.71, 0.88],
  lineFar: [0.95, 0.72, 0.55],
  farMix: 0.22,
  lineGain: 1,
  fill: [0.026, 0.03, 0.047],
  skyTop: [0.008, 0.01, 0.02],
  skyHorizon: [0.04, 0.047, 0.08],
  glow: [0.55, 0.62, 0.9],
  glowAmt: 0.14,
  rim: [0.7, 0.8, 1],
  rimAmt: 0.12,
  lantern: [0.72, 0.84, 1],
  lanternAmt: 1,
  particle: [0.8, 0.9, 1],
  stars: 1,
  moon: 1,
  amp: 1,
  terrace: 0,
  terraceStep: 18,
  jitter: 0,
  packets: 0,
  cities: 0,
  fireflies: 0,
  aurora: 0,
  glitch: 0,
  scanlines: 0,
  sun: 0,
  altitude: 0,
  lookUp: 0,
  fog: 0.35,
  veil: 0.14,
  speed: 1,
  bloom: 0.8,
  exposure: 1,
};

export const SCENES: Record<SceneId, SceneParams> = {
  night: NIGHT,
  kernel: {
    ...NIGHT,
    line: [1, 0.6, 0.2],
    lineFar: [1, 0.36, 0.08],
    farMix: 0.6,
    lineGain: 1.05,
    fill: [0.034, 0.02, 0.008],
    skyTop: [0.01, 0.006, 0.003],
    skyHorizon: [0.075, 0.038, 0.012],
    glow: [1, 0.5, 0.12],
    glowAmt: 0.3,
    rim: [1, 0.7, 0.3],
    rimAmt: 0.25,
    lantern: [1, 0.72, 0.3],
    stars: 0.2,
    moon: 0,
    amp: 0.92,
    terrace: 1,
    terraceStep: 16,
    scanlines: 1,
    altitude: -20,
    veil: 0.14,
    bloom: 1,
  },
  breach: {
    ...NIGHT,
    line: [0.36, 0.38, 0.46],
    lineFar: [0.55, 0.16, 0.2],
    farMix: 0.7,
    lineGain: 0.72,
    fill: [0.02, 0.012, 0.018],
    skyTop: [0.008, 0.004, 0.007],
    skyHorizon: [0.07, 0.012, 0.022],
    glow: [1, 0.08, 0.12],
    glowAmt: 0.16,
    rim: [1, 0.07, 0.12],
    rimAmt: 2.2,
    lantern: [1, 0.3, 0.32],
    stars: 0.45,
    moon: 0,
    amp: 1.12,
    glitch: 1,
    altitude: 10,
    veil: 0.14,
    bloom: 1.1,
  },
  signal: {
    ...NIGHT,
    line: [0.42, 0.76, 1],
    lineFar: [0.55, 0.72, 1],
    farMix: 0.5,
    lineGain: 0.85,
    fill: [0.01, 0.022, 0.038],
    skyTop: [0.004, 0.01, 0.02],
    skyHorizon: [0.02, 0.06, 0.095],
    glow: [0.25, 0.75, 1],
    glowAmt: 0.14,
    rim: [0.5, 0.9, 1],
    rimAmt: 0.2,
    lantern: [0.55, 0.95, 1],
    particle: [1, 0.86, 0.6],
    stars: 0.6,
    moon: 0,
    amp: 0.85,
    packets: 1,
    cities: 1,
    speed: 1.25,
    veil: 0.14,
    bloom: 1,
  },
  noise: {
    ...NIGHT,
    line: [0.64, 0.52, 1],
    lineFar: [0.95, 0.45, 0.9],
    farMix: 0.55,
    lineGain: 1,
    fill: [0.02, 0.014, 0.042],
    skyTop: [0.008, 0.004, 0.02],
    skyHorizon: [0.055, 0.03, 0.11],
    glow: [0.62, 0.35, 1],
    glowAmt: 0.25,
    rim: [0.85, 0.6, 1],
    rimAmt: 0.3,
    lantern: [0.82, 0.7, 1],
    stars: 0.5,
    moon: 0,
    jitter: 1,
    veil: 0.14,
    bloom: 0.95,
  },
  swarm: {
    ...NIGHT,
    line: [0.34, 0.58, 0.56],
    lineFar: [0.4, 0.7, 0.62],
    farMix: 0.4,
    lineGain: 0.72,
    fill: [0.01, 0.026, 0.028],
    skyTop: [0.003, 0.012, 0.016],
    skyHorizon: [0.02, 0.06, 0.06],
    glow: [0.3, 1, 0.72],
    glowAmt: 0.1,
    rim: [0.5, 1, 0.8],
    rimAmt: 0.15,
    lantern: [0.85, 1, 0.6],
    particle: [0.72, 1, 0.42],
    stars: 0.8,
    moon: 0,
    amp: 0.82,
    fireflies: 1,
    aurora: 1,
    altitude: -45,
    speed: 0.75,
    veil: 0.14,
    bloom: 1.1,
  },
  dawn: {
    ...NIGHT,
    line: [0.7, 0.72, 0.84],
    lineFar: [1, 0.6, 0.36],
    farMix: 1,
    lineGain: 1,
    fill: [0.05, 0.04, 0.052],
    skyTop: [0.028, 0.034, 0.07],
    skyHorizon: [0.2, 0.11, 0.1],
    glow: [1, 0.5, 0.24],
    glowAmt: 0.42,
    rim: [1, 0.62, 0.35],
    rimAmt: 0.6,
    lantern: [1, 0.8, 0.55],
    stars: 0.12,
    moon: 0,
    sun: 1,
    altitude: 60,
    lookUp: 50,
    fog: 0.28,
    veil: 0.08,
    speed: 0.9,
    bloom: 1,
  },
};

export function sceneAt(id: SceneId, progress: number): SceneParams {
  const base = SCENES[id] ?? NIGHT;
  if (id === 'noise') {
    return { ...base, jitter: 1 - smoothstep(0.02, 0.6, progress) };
  }
  if (id === 'dawn') {
    return { ...base, sun: 0.35 + 0.65 * smoothstep(0, 0.9, progress) };
  }
  return base;
}

export function mixParams(a: SceneParams, b: SceneParams, t: number): SceneParams {
  const o: Record<string, number | number[]> = {};
  const ra = a as unknown as Record<string, number | number[]>;
  const rb = b as unknown as Record<string, number | number[]>;
  for (const k in ra) {
    const va = ra[k];
    const vb = rb[k];
    o[k] = typeof va === 'number' ? va + ((vb as number) - va) * t : va.map((x, i) => x + ((vb as number[])[i] - x) * t);
  }
  return o as unknown as SceneParams;
}

interface Region {
  id: SceneId;
  top: number;
  bottom: number;
}

export interface SceneSample {
  a: SceneId;
  b: SceneId;
  t: number;
  pa: number;
  pb: number;
  dominant: SceneId;
  legacy: boolean;
}

const IDS = new Set<string>(Object.keys(SCENES));

export class SceneTracker {
  private regions: Region[] = [];
  private lastRefresh = 0;
  private forced: SceneId | null = null;
  private forcedProgress = 0.35;
  frozen = false;

  constructor() {
    try {
      const q = new URLSearchParams(window.location.search);
      const s = q.get('scene');
      if (s && IDS.has(s)) {
        this.forced = s as SceneId;
        const p = Number(q.get('progress'));
        this.forcedProgress = q.has('progress') && Number.isFinite(p) ? clamp01(p) : s === 'dawn' ? 0.8 : 0.3;
      }
    } catch {
      this.forced = null;
    }
  }

  refresh() {
    if (this.frozen) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-scene]'));
    const sy = window.scrollY;
    const next: Region[] = [];
    for (const el of els) {
      const id = el.dataset.scene || '';
      if (!IDS.has(id) || el.querySelector('[data-scene]')) continue;
      const r = el.getBoundingClientRect();
      if (r.height <= 0) continue;
      next.push({ id: id as SceneId, top: r.top + sy, bottom: r.bottom + sy });
    }
    next.sort((x, y) => x.top - y.top);
    this.regions = next;
    this.lastRefresh = performance.now();
  }

  maybeRefresh(now: number) {
    if (now - this.lastRefresh > 500) this.refresh();
  }

  sample(scrollY: number, vh: number, docHeight: number): SceneSample {
    if (this.forced) {
      return { a: this.forced, b: this.forced, t: 0, pa: this.forcedProgress, pb: this.forcedProgress, dominant: this.forced, legacy: false };
    }
    const rs = this.regions;
    const c = scrollY + vh * 0.5;
    if (!rs.length) {
      const progress = clamp01(scrollY / Math.max(1, docHeight - vh));
      const t = smoothstep(0.8, 1, progress);
      return { a: 'night', b: 'dawn', t, pa: progress, pb: smoothstep(0.8, 1, progress), dominant: t > 0.5 ? 'dawn' : 'night', legacy: true };
    }
    const prog = (r: Region) => clamp01((c - r.top) / Math.max(1, r.bottom - r.top));
    const bound = (i: number) => (rs[i].bottom + rs[i + 1].top) / 2;
    let i = 0;
    while (i < rs.length - 1 && c > bound(i)) i++;
    const lo = i > 0 ? bound(i - 1) : -Infinity;
    const hi = i < rs.length - 1 ? bound(i) : Infinity;
    const w = vh * 0.35;
    let ai = i;
    let bi = i;
    let t = 0;
    if (hi - c < c - lo && hi !== Infinity) {
      bi = i + 1;
      t = smoothstep(hi - w, hi + w, c);
    } else if (lo !== -Infinity) {
      ai = i - 1;
      t = smoothstep(lo - w, lo + w, c);
    }
    const a = rs[ai];
    const b = rs[bi];
    return { a: a.id, b: b.id, t, pa: prog(a), pb: prog(b), dominant: t > 0.5 ? b.id : a.id, legacy: false };
  }
}
