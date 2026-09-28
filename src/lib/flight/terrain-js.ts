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
  crystal: number;
  quantum: number;
  arena: number;
  mind: number;
  canyon: number;
}

export type TerrainVariation = [number, number, number, number];

const FLAT: TerrainVariation = [0, 0, 0, 0];

export const SHAPE_KEYS = ['amp', 'terrace', 'terraceStep', 'jitter', 'water', 'plain', 'hills', 'mesa', 'cloud', 'build', 'rise', 'bank', 'crystal', 'quantum', 'arena', 'mind', 'canyon'] as const;

export function terrainBase(x: number, z: number, v: TerrainVariation = FLAT, det = 1, alp = 0): number {
  const qx = x + v[0];
  const qz = z + v[1];
  const base = fbm(qx * 0.0024 + 5.2, qz * 0.0024 + 1.3);
  const ridge = ridged(qx * 0.0052 + 11.3, qz * 0.0052 + 4.7, 2 + v[2] + alp * 0.9, det);
  const big = snoise(qx * 0.0011 + 3.1, qz * 0.0011 + 7.9) * 0.5 + 0.5;
  const m = smoothstep(0.28, 0.85, base);
  const h = (m * m * 0.75 + ridge * m * 0.45 * (1 + v[2] * 0.35 + alp * 0.5)) * (150 + 140 * big) * (1 + alp * 0.45 * smoothstep(0.35, 0.9, big));
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

const R72C = 0.309017;
const R72S = 0.951057;

function crystalOne(vx: number, vz: number, dx: number, dz: number, size: number, tall: number): number {
  let rad = vx * dx + vz * dz;
  for (let k = 0; k < 4; k++) {
    const nx = dx * R72C - dz * R72S;
    dz = dx * R72S + dz * R72C;
    dx = nx;
    rad = Math.max(rad, vx * dx + vz * dz);
  }
  const k = 1 - rad / size;
  return k > 0 ? tall * Math.min(k * 4, 0.5 + 0.5 * k) : 0;
}

export function crystalH(x: number, z: number, ox: number, oz: number): number {
  const qx = x + ox;
  const qz = z + oz;
  const gx = qx / 110;
  const gz = qz / 110;
  const c0x = Math.floor(gx) + (fract(gx) >= 0.5 ? 1 : 0) - 1;
  const c0z = Math.floor(gz) + (fract(gz) >= 0.5 ? 1 : 0) - 1;
  let h = fbm(qx * 0.005 + 3.3, qz * 0.005 + 8.8) * 10;
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const cx = c0x + i;
      const cz = c0z + j;
      const r = hash22(cx + 0.37, cz + 0.37);
      const tx = (cx + 0.22 + r[0] * 0.56) * 110;
      const tz = (cz + 0.22 + r[1] * 0.56) * 110;
      const px = tx - ox;
      const pz = tz - oz;
      const cl = smoothstep(-0.3, 0.4, snoise(tx * 0.0032 + 6.1, tz * 0.0032 + 2.4)) * smoothstep(45, 150, Math.abs(px - pathX(pz)));
      if (cl <= 0) continue;
      const a = hash12(cx + 8.3, cz + 8.3) * 6.2832;
      const dx = Math.cos(a);
      const dz = Math.sin(a);
      const size = 13 + r[1] * 13;
      const tall = (70 + hash12(cx + 1.9, cz + 1.9) * 150) * cl;
      h = Math.max(h, crystalOne(qx - tx, qz - tz, dx, dz, size, tall));
      const so = hash22(cx + 5.1, cz + 5.1);
      const sx = (so[0] - 0.5) * size * 2.6;
      const sz = (so[1] - 0.5) * size * 2.6;
      h = Math.max(h, crystalOne(qx - tx - sx, qz - tz - sz, -dz, dx, size * 0.7, tall * 0.62));
      h = Math.max(h, crystalOne(qx - tx + sz, qz - tz - sx, dz, dx, size * 0.55, tall * 0.4));
    }
  }
  return h;
}

export function quantumH(x: number, z: number, ox: number, oz: number, t: number): number {
  const qx = x + ox;
  const qz = z + oz;
  let psi = 0;
  let norm = 1e-4;
  const zn = Math.floor(qz / 700 + 0.5);
  for (let k = -1; k < 2; k++) {
    const n = zn + k;
    const sz = n * 700;
    const sx = pathX(sz - oz) + ox + ((n - Math.floor(n / 2) * 2) * 2 - 1) * 200;
    const r = Math.hypot(qx - sx, qz - sz);
    const env = Math.exp((-r * r) / 202500);
    psi += Math.cos(r * 0.075 - t * 0.9) * env;
    norm += env * env;
  }
  const I = (psi * psi) / norm;
  return 70 * (1 - Math.exp(-I * 1.2)) + 2;
}

function arenaLevel(cx: number, cz: number, ox: number, oz: number): number {
  const px = (cx + 0.5) * 24;
  const pz = (cz + 0.5) * 24;
  const n = snoise(px * 0.0034 + 1.9, pz * 0.0034 + 6.3) * 0.85 + snoise(px * 0.012 + 8.2, pz * 0.012 + 0.7) * 0.15;
  const lv = Math.floor(Math.min(0.999, Math.max(0, n * 0.62 + 0.55)) * 5);
  return Math.min(lv, Math.floor(Math.max(Math.abs(px - ox - pathX(pz - oz)) - 40, 0) / 48));
}

const box = (fx: number, fz: number, x0: number, x1: number, z0: number, z1: number) => (fx >= x0 && fx <= x1 && fz >= z0 && fz <= z1 ? 1 : 0);

export function arenaH(x: number, z: number, ox: number, oz: number): number {
  ox = Math.floor(ox / 24) * 24;
  oz = Math.floor(oz / 24) * 24;
  const gx = (x + ox) / 24;
  const gz = (z + oz) / 24;
  const cx = Math.floor(gx);
  const cz = Math.floor(gz);
  const fx = gx - cx;
  const fz = gz - cz;
  const lv = arenaLevel(cx, cz, ox, oz);
  const r = hash12(cx + 2.9, cz + 2.9);
  if (r < 0.22) {
    const alongX = r < 0.11;
    const ln = arenaLevel(cx + (alongX ? 1 : 0), cz + (alongX ? 0 : 1), ox, oz);
    if (Math.abs(ln - lv) === 1) return lerp(lv, ln, alongX ? fx : fz) * 16;
  }
  const h = lv * 16;
  if (lv >= 1 && hash12(Math.floor(cx / 6) + 5.7, Math.floor(cz / 6) + 5.7) > 0.7 && cx - Math.floor(cx / 2) * 2 === 0) return h + 26 * box(fx, fz, 0.2, 0.75, 0.06, 0.94);
  if (r > 0.95) return h + 12 * box(fx, fz, 0.22, 0.78, 0.22, 0.78);
  return h;
}

function mindH(qx: number, qz: number, d: number): number {
  const wx = qx + snoise(qx * 0.0019 + 1.7, qz * 0.0019 + 4.2) * 110;
  const wz = qz + snoise(qx * 0.0019 + 8.3, qz * 0.0019 + 2.9) * 110;
  const r1 = 1 - Math.abs(snoise(wx * 0.0014 + 3.3, wz * 0.0014 + 7.7));
  const h = r1 * r1 * r1 * 110 + 3;
  return h * (0.35 + 0.65 * smoothstep(40, 260, d));
}

function canyonH(qx: number, qz: number, d: number): number {
  const dd = d + snoise(qx * 0.0045 + 2.1, qz * 0.0045 + 9.4) * 24 + snoise(qx * 0.014 + 5.3, qz * 0.014 + 1.1) * 7;
  const top = 205 + (fbm(qx * 0.0016 + 3.7, qz * 0.0016 + 6.2) - 0.5) * 130;
  const w = smoothstep(52, 150, dd);
  const t = (top * w * (0.7 + 0.3 * w)) / 20;
  const ft = Math.floor(t);
  return Math.max((ft + smoothstep(0.62, 1, t - ft)) * 20, 1.5 + snoise(qx * 0.012 + 4.4, qz * 0.012 + 3.3) * 0.8);
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
  alp: [number, number] = [0, 0];
  time = 0;

  constructor(s: TerrainShape) {
    this.a = s;
    this.b = s;
  }

  private base(x: number, z: number, m: number, det: number): number {
    const { va, vb, alp } = this;
    if (m <= 0.001 || (va === vb && alp[0] === alp[1])) return terrainBase(x, z, va, det, alp[0]);
    if (m >= 0.999) return terrainBase(x, z, vb, det, alp[1]);
    return lerp(terrainBase(x, z, va, det, alp[0]), terrainBase(x, z, vb, det, alp[1]), m);
  }

  height(x: number, z: number, m: number): number {
    const { a, b, va, vb } = this;
    const s = (k: typeof SHAPE_KEYS[number]) => a[k] + (b[k] - a[k]) * m;
    const side = (k: typeof SHAPE_KEYS[number], fn: (qx: number, qz: number) => number) => {
      const wa = a[k] * (1 - m);
      const wb = b[k] * m;
      return ((wa > 0 ? wa * fn(x + va[0], z + va[1]) : 0) + (wb > 0 ? wb * fn(x + vb[0], z + vb[1]) : 0)) / Math.max(wa + wb, 1e-5);
    };
    const offSide = (k: typeof SHAPE_KEYS[number], fn: (ox: number, oz: number) => number) => {
      const wa = a[k] * (1 - m);
      const wb = b[k] * m;
      return ((wa > 0 ? wa * fn(va[0], va[1]) : 0) + (wb > 0 ? wb * fn(vb[0], vb[1]) : 0)) / Math.max(wa + wb, 1e-5);
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
    const crystal = a.crystal * (1 - m) + b.crystal * m;
    const quantum = a.quantum * (1 - m) + b.quantum * m;
    const arena = a.arena * (1 - m) + b.arena * m;
    const mind = a.mind * (1 - m) + b.mind * m;
    const canyon = a.canyon * (1 - m) + b.canyon * m;
    let h = hills + mesa + crystal + quantum + arena + mind + canyon < 0.999 ? this.base(x, z, m, det) * amp : 0;
    if (hills > 0.001) h = lerp(h, side('hills', (px, pz) => hillsH(px, pz, d)), hills);
    if (mesa > 0.001) h = lerp(h, side('mesa', mesaH), mesa);
    if (crystal > 0.001) h = lerp(h, offSide('crystal', (ox, oz) => crystalH(x, z, ox, oz)), crystal);
    if (quantum > 0.001) h = lerp(h, offSide('quantum', (ox, oz) => quantumH(x, z, ox, oz, this.time)), quantum);
    if (arena > 0.001) h = lerp(h, offSide('arena', (ox, oz) => arenaH(x, z, ox, oz)), arena);
    if (mind > 0.001) h = lerp(h, side('mind', (px, pz) => mindH(px, pz, d)), mind);
    if (canyon > 0.001) h = lerp(h, side('canyon', (px, pz) => canyonH(px, pz, d)), canyon);
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
