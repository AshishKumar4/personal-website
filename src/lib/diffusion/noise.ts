export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussianBuffer(length: number, seed: number): Float32Array {
  const rand = mulberry32(seed);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 2) {
    const u1 = Math.max(rand(), 1e-7);
    const u2 = rand();
    const r = Math.sqrt(-2 * Math.log(u1));
    out[i] = r * Math.cos(2 * Math.PI * u2);
    if (i + 1 < length) out[i + 1] = r * Math.sin(2 * Math.PI * u2);
  }
  return out;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function renderNoisy(out: ImageData, x0: Uint8ClampedArray | null, eps: Float32Array, signal: number, noise: number) {
  const d = out.data;
  const n = d.length / 4;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const e = i * 3;
    for (let c = 0; c < 3; c++) {
      const x = x0 ? x0[o + c] / 127.5 - 1 : -1;
      const v = signal * x + noise * eps[e + c];
      d[o + c] = (v * 0.5 + 0.5) * 255;
    }
    d[o + 3] = 255;
  }
}
