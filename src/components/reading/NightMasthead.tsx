import { useMemo, type ReactNode } from 'react';
import { Container } from '@/components/site/SectionHeader';
import { cn } from '@/lib/utils';
import { DISPLAY_TITLE } from './styles';

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 1440;
const H = 240;
const ROWS = 9;
const STEP = 12;

export function Horizon({ seed, className }: { seed: string; className?: string }) {
  const rows = useMemo(() => {
    const rand = seeded(seed);
    const peaks = Array.from({ length: 9 }, () => ({ x: rand() * W, w: 60 + rand() * 180, h: 30 + rand() * 120 }));
    const phase = rand() * 100;
    const raw = Array.from({ length: ROWS }, (_, r) => {
      const depth = r / (ROWS - 1);
      const base = 70 + depth * (H - 80);
      const shift = (1 - depth) * 140;
      const ys: number[] = [];
      for (let x = 0; x <= W; x += STEP) {
        let y = 0;
        for (const p of peaks) {
          const d = Math.abs(x + shift - p.x) / p.w;
          y += p.h * Math.max(0, 1 - d) ** 1.6;
        }
        const u = (x + shift) * 0.012 + phase + r * 0.7;
        y += (1 - Math.abs(Math.sin(u))) * 14 + (1 - Math.abs(Math.sin(u * 2.7))) * 6;
        ys.push(y * (0.35 + depth * 0.65));
      }
      return { depth, base, ys };
    });
    const scale = Math.min(1, ...raw.map(row => (row.base - 8) / Math.max(1, ...row.ys)));
    return raw.map(({ depth, base, ys }) => {
      const pts = ys.map((y, i) => `${i * STEP},${(base - y * scale).toFixed(1)}`).join(' ');
      return { line: pts, fill: `${pts} ${W},${H} 0,${H}`, opacity: 0.07 + depth * 0.26 };
    });
  }, [seed]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn('pointer-events-none block h-full w-full', className)}
      style={{ maskImage: 'linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 18%, #000 82%, transparent)' }}
    >
      {rows.map((row, i) => (
        <g key={i}>
          <polygon points={row.fill} fill="hsl(var(--background))" />
          <polyline points={row.line} fill="none" stroke="hsl(var(--foreground))" strokeOpacity={row.opacity} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        </g>
      ))}
    </svg>
  );
}

export function NightSky() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[80vh] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_-10%,hsl(222_60%_22%/0.45),transparent_62%)]" />
      <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(1px_1px_at_12%_22%,hsl(0_0%_100%/0.5),transparent),radial-gradient(1px_1px_at_28%_8%,hsl(0_0%_100%/0.35),transparent),radial-gradient(1px_1px_at_46%_30%,hsl(0_0%_100%/0.3),transparent),radial-gradient(1px_1px_at_63%_12%,hsl(0_0%_100%/0.45),transparent),radial-gradient(1px_1px_at_78%_26%,hsl(0_0%_100%/0.3),transparent),radial-gradient(1px_1px_at_90%_6%,hsl(0_0%_100%/0.4),transparent),radial-gradient(1.5px_1.5px_at_36%_18%,hsl(0_0%_100%/0.55),transparent),radial-gradient(1px_1px_at_7%_40%,hsl(0_0%_100%/0.25),transparent)]" />
    </div>
  );
}

export function MonoMeta({ items, className }: { items: ReactNode[]; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-foreground/50', className)}>
      {items.filter(Boolean).map((item, i) => (
        <span key={i} className="flex items-center gap-3">
          {i > 0 && <span className="h-px w-4 bg-foreground/20" aria-hidden="true" />}
          {item}
        </span>
      ))}
    </div>
  );
}

export function NightMasthead({
  seed,
  meta,
  title,
  lede,
  children,
  className,
  titleClassName,
}: {
  seed: string;
  meta: ReactNode[];
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <header className={cn('relative isolate', className)}>
      <NightSky />
      <Container className="pt-36 md:pt-48">
        <MonoMeta items={meta} />
        <h1 className={cn(DISPLAY_TITLE, 'mt-8 text-[clamp(2.75rem,7.4vw,7.25rem)] leading-[0.95] md:mt-10', titleClassName)}>{title}</h1>
        {lede && <div className="mt-8 max-w-[34ch] font-serif text-[clamp(1.25rem,1.9vw,1.6rem)] italic leading-[1.4] text-foreground/65 md:mt-10">{lede}</div>}
        {children}
      </Container>
      <div className="mt-14 h-24 md:mt-20 md:h-36">
        <Horizon seed={seed} />
      </div>
    </header>
  );
}
