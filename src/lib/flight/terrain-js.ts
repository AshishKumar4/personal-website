import { lerp, pathX, smoothstep } from './math';

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

function ridged(x: number, y: number, e: number, det: number): number {
  let sum = 0;
  let amp = 0.55;
  let freq = 1;
  let prev = 1;
  for (let i = 0; i < 5; i++) {
    const n = Math.pow(Math.max(0, 1 - Math.abs(snoise(x * freq, y * freq))), e);
    sum += n * amp * prev * Math.min(1, Math.max(0, det * 4 - i + 1));
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

const fract = (x: number) => x - Math.floor(x);

function hash3(x: number, y: number, kx: number, ky: number, kz: number): [number, number, number] {
  let a = fract(x * kx);
  let b = fract(y * ky);
  let c = fract(x * kz);
  const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
  a += d;
  b += d;
  c += d;
  return [a, b, c];
}

export function hash12(x: number, y: number): number {
  const [a, b, c] = hash3(x, y, 0.1031, 0.1031, 0.1031);
  return fract((a + b) * c);
}

function hash22(x: number, y: number): [number, number] {
  const [a, b, c] = hash3(x, y, 0.1031, 0.103, 0.0973);
  return [fract((a + b) * c), fract((a + c) * b)];
}

export interface TerrainShape {
  amp: number;
  terrace: number;
  terraceStep: number;
  jitter: number;
  water: number;
  plain: number;
  hills: number;
  mesa: number;
  cloud: number;
  build: number;
  rise: number;
  bank: number;
}

export type TerrainVariation = [number, number, number, number];

const FLAT: TerrainVariation = [0, 0, 0, 0];

export const SHAPE_KEYS = ['amp', 'terrace', 'terraceStep', 'jitter', 'water', 'plain', 'hills', 'mesa', 'cloud', 'build', 'rise', 'bank'] as const;

export function terrainBase(x: number, z: number, v: TerrainVariation = FLAT, det = 1): number {
  const qx = x + v[0];
  const qz = z + v[1];
  const base = fbm(qx * 0.0024 + 5.2, qz * 0.0024 + 1.3);
  const ridge = ridged(qx * 0.0052 + 11.3, qz * 0.0052 + 4.7, 2 + v[2], det);
  const big = snoise(qx * 0.0011 + 3.1, qz * 0.0011 + 7.9) * 0.5 + 0.5;
  const m = smoothstep(0.28, 0.85, base);
  const h = (m * m * 0.75 + ridge * m * 0.45 * (1 + v[2] * 0.35)) * (150 + 140 * big);
  const carve = smoothstep(10, 170 * (1 + v[3]), Math.abs(x - pathX(z)));
  return h * (0.2 + 0.8 * carve);
}

function hillsH(qx: number, qz: number, d: number): number {
  const n = fbm(qx * 0.0016 + 2.3, qz * 0.0016 + 8.1);
  return (Math.pow(smoothstep(0.22, 0.86, n), 1.5) * 150 + 5) * (0.3 + 0.7 * smoothstep(30, 280, d));
}

function mesaH(qx: number, qz: number): number {
  const wx = qx + snoise(qx * 0.006 + 1.3, qz * 0.006 + 1.3) * 7;
  const wz = qz + snoise(qx * 0.006 + 7.9, qz * 0.006 + 7.9) * 7;
  const cx = Math.floor(wx / 260);
  const cz = Math.floor(wz / 260);
  const j = hash22(cx + 0.5, cz + 0.5);
  const ox = (cx + 0.5 + (j[0] - 0.5) * 0.08) * 260;
  const oz = (cz + 0.5 + (j[1] - 0.5) * 0.08) * 260;
  const hs = hash22(cx + 3.3, cz + 3.3);
  const sd = Math.max(Math.abs(wx - ox) - (40 + hs[0] * 55), Math.abs(wz - oz) - (40 + hs[1] * 55));
  const on = (hash12(cx + 7.1, cz + 7.1) >= 0.42 ? 1 : 0) * (Math.abs(ox - pathX(oz)) >= 250 ? 1 : 0);
  const top = 58 + Math.floor(hash12(cx + 9.4, cz + 9.4) * 4) * 22;
  const h = top * Math.max(1 - smoothstep(-2, 4, sd), (1 - smoothstep(2, 24, sd)) * 0.3) * on;
  return h + fbm(qx * 0.006, qz * 0.006) * 4;
}

function cloudTop(qx: number, qz: number): number {
  return 92 + snoise(qx * 0.0032 + 4.1, qz * 0.0032 + 1.7) * 16 + snoise(qx * 0.011 + 9.3, qz * 0.011 + 3.1) * 5;
}

function bankTop(qx: number, qz: number, t: number): number {
  const px = qx + t * 1.6;
  const pz = qz + t * 0.5;
  const n = smoothstep(0, 0.5, snoise(px * 0.0032 + 5.1, pz * 0.0032 + 2.3));
  return 4 + n * (30 + snoise(px * 0.011 + 1.9, pz * 0.011 + 8.4) * 8);
}

function smax(a: number, b: number, k: number): number {
  const h = Math.min(1, Math.max(0, 0.5 + (0.5 * (a - b)) / k));
  return b + (a - b) * h + k * h * (1 - h);
}

export class TerrainField {
  a: TerrainShape;
  b: TerrainShape;
  va: TerrainVariation = FLAT;
  vb: TerrainVariation = FLAT;
  time = 0;

  constructor(s: TerrainShape) {
    this.a = s;
    this.b = s;
  }

  private base(x: number, z: number, m: number, det: number): number {
    const { va, vb } = this;
    if (m <= 0.001 || va === vb) return terrainBase(x, z, va, det);
    if (m >= 0.999) return terrainBase(x, z, vb, det);
    return lerp(terrainBase(x, z, va, det), terrainBase(x, z, vb, det), m);
  }

  height(x: number, z: number, m: number): number {
    const { a, b, va, vb } = this;
    const s = (k: typeof SHAPE_KEYS[number]) => a[k] + (b[k] - a[k]) * m;
    const side = (k: typeof SHAPE_KEYS[number], fn: (qx: number, qz: number) => number) => {
      const wa = a[k] * (1 - m);
      const wb = b[k] * m;
      return ((wa > 0 ? wa * fn(x + va[0], z + va[1]) : 0) + (wb > 0 ? wb * fn(x + vb[0], z + vb[1]) : 0)) / Math.max(wa + wb, 1e-5);
    };
    const d = Math.abs(x - pathX(z));
    const det = 1 - s('jitter');
    const amp = s('amp');
    const hills = s('hills');
    const mesa = s('mesa');
    const plain = s('plain');
    const water = s('water');
    const build = s('build');
    const terrace = s('terrace');
    const cloud = s('cloud');
    let h = hills + mesa < 0.999 ? this.base(x, z, m, det) * amp : 0;
    if (hills > 0.001) h = lerp(h, side('hills', (px, pz) => hillsH(px, pz, d)), hills);
    if (mesa > 0.001) h = lerp(h, side('mesa', mesaH), mesa);
    if (plain > 0.001) {
      const pv = a.plain * (1 - m) >= b.plain * m ? va : vb;
      h = lerp(h, h * smoothstep(220, 620, d) * 1.2 + fbm((x + pv[0]) * 0.006, (z + pv[1]) * 0.006) * 4, plain);
    }
    if (water > 0.001) h = lerp(h, Math.max(h * smoothstep(150, 520, d) * 1.35 - 14, 0), water);
    if (build > 0.001) {
      const tx = Math.floor(x / 24);
      const tz = Math.floor(z / 24);
      const hb = Math.floor((this.base((tx + 0.5) * 24, (tz + 0.5) * 24, m, det) * amp) / 14) * 14;
      h = lerp(h, hb * smoothstep(0, 0.08, s('rise') * 1.2 - hash12(tx + 1.7, tz + 1.7) * 1.05), build);
    }
    if (terrace > 0.001) {
      const step = s('terraceStep');
      const q = h / step;
      const t = (Math.floor(q) + smoothstep(0.78, 1, q - Math.floor(q))) * step;
      h += (t - h) * terrace;
    }
    if (cloud > 0.001) h = lerp(h, smax(h, side('cloud', cloudTop), 10), cloud);
    const bank = s('bank');
    if (bank > 0.001) h = lerp(h, smax(h, side('bank', (px, pz) => bankTop(px, pz, this.time)), 6), bank);
    return h;
  }
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
