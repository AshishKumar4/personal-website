export const TIMESTEPS = 1000;
export const COSINE_S = 0.008;

const f0 = Math.cos((COSINE_S / (1 + COSINE_S)) * Math.PI * 0.5) ** 2;

export function alphaBar(t: number): number {
  const c = Math.cos(((clamp01(t) + COSINE_S) / (1 + COSINE_S)) * Math.PI * 0.5);
  return Math.max((c * c) / f0, 1e-5);
}

export function signalScale(t: number): number {
  return Math.sqrt(alphaBar(t));
}

export function noiseScale(t: number): number {
  return Math.sqrt(1 - alphaBar(t));
}

export function snr(t: number): number {
  const a = alphaBar(t);
  return a / (1 - a);
}

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function quantize(t: number, steps: number): { t: number; step: number } {
  const step = Math.round((1 - clamp01(t)) * steps);
  return { t: 1 - step / steps, step };
}

export function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function easeOutQuart(x: number): number {
  return 1 - Math.pow(1 - x, 4);
}

export function schedulePath(width: number, height: number, samples = 64): string {
  let d = '';
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = t * width;
    const y = (1 - alphaBar(t)) * height;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${(height - y).toFixed(1)}`;
  }
  return d;
}

export function hex(n: number, width = 4): string {
  return (n >>> 0).toString(16).toUpperCase().padStart(width, '0');
}
