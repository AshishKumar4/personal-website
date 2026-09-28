import { DEFAULT_ORIGINS } from '@shared/types';

export interface OriginChapter {
  title: string;
  label: string;
  body: string[];
}

export function parseOrigins(text: string | undefined): OriginChapter[] {
  const source = text?.trim() ? text : DEFAULT_ORIGINS;
  const chapters: OriginChapter[] = [];
  for (const chunk of source.split(/^##\s+/m)) {
    const lines = chunk.split('\n');
    const head = lines.shift()?.trim() ?? '';
    if (!head) continue;
    const [title, ...rest] = head.split('|');
    const body = lines
      .join('\n')
      .split(/\n\s*\n/)
      .map(p => p.replace(/\s*\n\s*/g, ' ').trim())
      .filter(Boolean);
    if (!title.trim() || !body.length) continue;
    chapters.push({ title: title.trim(), label: rest.join('|').trim(), body });
  }
  return chapters;
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function orbitalCloud(count: number, cx: number, cy: number, scale: number) {
  const rand = mulberry(1926);
  const out: { x: number; y: number; o: number; r: number }[] = [];
  while (out.length < count) {
    const x = (rand() * 2 - 1) * 1.6;
    const y = (rand() * 2 - 1) * 1.6;
    const r = Math.hypot(x, y);
    const psi = x * y * Math.exp(-r * 1.35) * 5.2;
    const density = psi * psi;
    if (rand() > density * 1.6) continue;
    out.push({ x: cx + x * scale, y: cy + y * scale * 0.82, o: 0.25 + Math.min(1, density * 2.2) * 0.7, r: 0.9 + rand() * 1.1 });
  }
  return out;
}

export interface NetNode {
  x: number;
  y: number;
  layer: number;
}

export function network(layers: number[], width: number, height: number, pad: number) {
  const nodes: NetNode[] = [];
  const span = (width - pad * 2) / (layers.length - 1);
  layers.forEach((n, li) => {
    const gap = Math.min(58, (height - pad * 2) / Math.max(1, n - 1));
    for (let i = 0; i < n; i++) nodes.push({ layer: li, x: pad + li * span, y: height / 2 + (i - (n - 1) / 2) * gap });
  });
  const edges: [NetNode, NetNode][] = [];
  for (let li = 0; li < layers.length - 1; li++) {
    const from = nodes.filter(n => n.layer === li);
    const to = nodes.filter(n => n.layer === li + 1);
    for (const a of from) for (const b of to) edges.push([a, b]);
  }
  const rand = mulberry(1950);
  const pulses = edges.map((e, i) => ({ e, i, k: rand() })).filter(p => p.k < 0.22).map(p => ({ edge: p.e, delay: -(p.k * 11).toFixed(2) }));
  return { nodes, edges, pulses };
}
