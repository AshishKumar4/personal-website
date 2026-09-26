import { pathX, smoothstep } from './math';

const C0 = 0.211324865405187;
const C1 = 0.366025403784439;
const C2 = -0.577350269189626;
const C3 = 0.024390243902439;

const mod289 = (x: number) => x - Math.floor(x / 289) * 289;
const permute = (x: number) => mod289((x * 34 + 1) * x);

function grad(p: number, x: number, y: number, m: number): number {
  if (m <= 0) return 0;
  m = m * m;
  m = m * m;
  const gx = 2 * (p * C3 - Math.floor(p * C3)) - 1;
  const h = Math.abs(gx) - 0.5;
  const a0 = gx - Math.floor(gx + 0.5);
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  return m * (a0 * x + h * y);
}

export function snoise(vx: number, vy: number): number {
  const s = (vx + vy) * C1;
  let ix = Math.floor(vx + s);
  let iy = Math.floor(vy + s);
  const t = (ix + iy) * C0;
  const x0 = vx - ix + t;
  const y0 = vy - iy + t;
  const i1x = x0 > y0 ? 1 : 0;
  const i1y = 1 - i1x;
  const x1 = x0 + C0 - i1x;
  const y1 = y0 + C0 - i1y;
  const x2 = x0 + C2;
  const y2 = y0 + C2;
  ix = mod289(ix);
  iy = mod289(iy);
  const p0 = permute(permute(iy) + ix);
  const p1 = permute(permute(iy + i1y) + ix + i1x);
  const p2 = permute(permute(iy + 1) + ix + 1);
  return 130 * (
    grad(p0, x0, y0, 0.5 - (x0 * x0 + y0 * y0)) +
    grad(p1, x1, y1, 0.5 - (x1 * x1 + y1 * y1)) +
    grad(p2, x2, y2, 0.5 - (x2 * x2 + y2 * y2))
  );
}

function ridged(x: number, y: number, e: number): number {
  let sum = 0;
  let amp = 0.55;
  let freq = 1;
  let prev = 1;
  for (let i = 0; i < 5; i++) {
    const n = Math.pow(Math.max(0, 1 - Math.abs(snoise(x * freq, y * freq))), e);
    sum += n * amp * prev;
    prev = n;
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
}

function fbm(x: number, y: number): number {
  let sum = 0;
  let amp = 0.5;
  for (let i = 0; i < 4; i++) {
    sum += amp * snoise(x, y);
    x = x * 2.01 + 17.3;
    y = y * 2.01 + 9.1;
    amp *= 0.5;
  }
  return sum * 0.5 + 0.5;
}

export interface TerrainShape {
  amp: number;
  terrace: number;
  terraceStep: number;
}

export type TerrainVariation = [number, number, number, number];

const FLAT: TerrainVariation = [0, 0, 0, 0];

export function terrainBase(x: number, z: number, v: TerrainVariation = FLAT): number {
  const qx = x + v[0];
  const qz = z + v[1];
  const base = fbm(qx * 0.0024 + 5.2, qz * 0.0024 + 1.3);
  const ridge = ridged(qx * 0.0052 + 11.3, qz * 0.0052 + 4.7, 2 + v[2]);
  const big = snoise(qx * 0.0011 + 3.1, qz * 0.0011 + 7.9) * 0.5 + 0.5;
  const m = smoothstep(0.28, 0.85, base);
  const h = (m * m * 0.75 + ridge * m * 0.45 * (1 + v[2] * 0.35)) * (150 + 140 * big);
  const carve = smoothstep(10, 170 * (1 + v[3]), Math.abs(x - pathX(z)));
  return h * (0.2 + 0.8 * carve);
}

export function shapeHeight(base: number, s: TerrainShape): number {
  let h = base * s.amp;
  if (s.terrace > 0.001) {
    const q = h / s.terraceStep;
    const t = (Math.floor(q) + smoothstep(0.78, 1, q - Math.floor(q))) * s.terraceStep;
    h += (t - h) * s.terrace;
  }
  return h;
}

export function terrainHeight(x: number, z: number, s: TerrainShape, v: TerrainVariation = FLAT): number {
  return shapeHeight(terrainBase(x, z, v), s);
}

export function raycast(o: number[], d: number[], height: (x: number, z: number) => number, maxT: number): [number, number, number] | null {
  let t = 2;
  let prev = 0;
  for (let i = 0; i < 110 && t < maxT; i++) {
    const y = o[1] + d[1] * t;
    const h = height(o[0] + d[0] * t, o[2] + d[2] * t);
    const gap = y - h;
    if (gap < 0) {
      let lo = prev;
      let hi = t;
      for (let k = 0; k < 7; k++) {
        const mid = (lo + hi) / 2;
        const my = o[1] + d[1] * mid;
        if (my < height(o[0] + d[0] * mid, o[2] + d[2] * mid)) hi = mid;
        else lo = mid;
      }
      return [o[0] + d[0] * hi, o[1] + d[1] * hi, o[2] + d[2] * hi];
    }
    prev = t;
    t += Math.max(1.5, gap * 0.45, t * 0.012);
  }
  return null;
}
