import { useMemo } from 'react';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 400;
const H = 250;

export function RidgeArt({ seed, className, hue }: { seed: string; className?: string; hue?: number }) {
  const h = hue === undefined ? null : Math.round(hue * 360);
  const sky = h === null ? ['hsl(228 22% 6%)', 'hsl(24 30% 11%)', 'hsl(228 20% 7%)'] : [`hsl(${h} 30% 5%)`, `hsl(${h} 45% 13%)`, `hsl(${h} 25% 6%)`];
  const ground = h === null ? 'hsl(228 20% 7%)' : `hsl(${h} 22% 5%)`;
  const stroke = h === null ? 'hsl(222 30% 82%)' : `hsl(${h} 70% 80%)`;
  const lines = useMemo(() => {
    const rand = rng(hash(seed));
    const peaks = Array.from({ length: 4 }, () => ({ x: 40 + rand() * 320, w: 30 + rand() * 70, h: 30 + rand() * 70 }));
    const rows = 26;
    const out: { d: string; fill: string; o: number }[] = [];
    for (let r = 0; r < rows; r++) {
      const t = r / (rows - 1);
      const base = 70 + t * 165;
      const scale = 0.35 + t * 0.9;
      const phase = rand() * 10;
      let d = '';
      for (let x = 0; x <= W; x += 4) {
        let y = 0;
        for (const p of peaks) {
          const dx = (x - p.x) / (p.w * (0.6 + t * 0.8));
          y += p.h * Math.exp(-dx * dx) * (1 - Math.abs(t - 0.45) * 0.9);
        }
        y += Math.sin(x * 0.045 + phase) * 3 + Math.sin(x * 0.13 + phase * 2) * 1.5;
        d += `${x === 0 ? 'M' : 'L'}${x},${(base - y * scale).toFixed(1)}`;
      }
      out.push({ d, fill: `${d}L${W},${H}L0,${H}Z`, o: 0.18 + t * 0.55 });
    }
    return out;
  }, [seed]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${seed}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="0.35" stopColor={sky[1]} />
          <stop offset="0.6" stopColor={sky[2]} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#sky-${seed})`} />
      {lines.map((l, i) => (
        <g key={i}>
          <path d={l.fill} fill={ground} />
          <path d={l.d} fill="none" stroke={stroke} strokeOpacity={l.o} strokeWidth="0.8" />
        </g>
      ))}
    </svg>
  );
}
