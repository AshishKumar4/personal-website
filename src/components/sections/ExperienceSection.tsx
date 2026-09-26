import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Experience } from '@shared/types';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Container, SectionHeader } from '@/components/site/SectionHeader';
import { shortDuration, yearsFromDuration } from '@/lib/site-data';
import { mulberry32 } from '@/lib/diffusion/noise';

interface Checkpoint {
  exp: Experience;
  index: number;
  start: number;
  end: number | null;
  current: boolean;
}

const W = 1000;
const H = 200;

function buildCurve(points: Checkpoint[], y0: number, y1: number) {
  const rand = mulberry32(7);
  const restarts = points.map(p => (p.start - y0) / (y1 - y0)).filter(x => x > 0.01).sort((a, b) => a - b);
  const samples = 220;
  let d = '';
  let area = '';
  const ys: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = i / samples;
    const base = 0.1 + 0.78 * Math.exp(-2.6 * x);
    let bump = 0;
    for (const r of restarts) {
      if (x >= r) bump += 0.16 * Math.exp(-(x - r) * 26) * (1 - r * 0.4);
    }
    const jitter = (rand() - 0.5) * 0.05 * (1 - x * 0.6);
    const y = Math.min(0.98, base + bump + jitter);
    ys.push(y);
    const px = x * W;
    const py = y * H;
    d += `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${(H - py).toFixed(1)}`;
  }
  area = `${d}L${W},${H}L0,${H}Z`;
  const at = (x: number) => ys[Math.round(Math.max(0, Math.min(1, x)) * samples)];
  return { d, area, at };
}

function LossCurve({ points, active, onHover }: { points: Checkpoint[]; active: string | null; onHover: (id: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);
  const y0 = Math.min(...points.map(p => p.start));
  const y1 = new Date().getFullYear() + 1;
  const curve = useMemo(() => buildCurve(points, y0, y1), [points, y0, y1]);
  const years = useMemo(() => Array.from({ length: y1 - y0 + 1 }, (_, i) => y0 + i), [y0, y1]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setDrawn(true);
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const xOf = (year: number) => (year - y0) / (y1 - y0);

  return (
    <div ref={ref} className="relative">
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>val loss ↓</span>
        <span className="hidden sm:inline">cosine annealing · warm restart at every new job</span>
      </div>
      <div className="relative h-[180px] w-full md:h-[220px]">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <clipPath id="lossclip">
              <rect
                x="0"
                y="-10"
                width={W}
                height={H + 20}
                style={{ transform: `scaleX(${drawn ? 1 : 0})`, transformOrigin: '0 0', transformBox: 'view-box', transition: 'transform 2.2s cubic-bezier(0.65, 0, 0.35, 1)' }}
              />
            </clipPath>
            <linearGradient id="lossfill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--signal))" stopOpacity="0.16" />
              <stop offset="100%" stopColor="hsl(var(--signal))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map(g => (
            <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="hsl(var(--foreground))" strokeOpacity="0.07" vectorEffect="non-scaling-stroke" />
          ))}
          <g clipPath="url(#lossclip)">
            <path d={curve.area} fill="url(#lossfill)" />
            <path d={curve.d} fill="none" stroke="hsl(var(--foreground))" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
          </g>
          {points.map(p => {
            const x = xOf(p.start) * W;
            const on = active === p.exp.id;
            return (
              <line
                key={p.exp.id}
                x1={x}
                x2={x}
                y1={0}
                y2={H}
                stroke={on ? 'hsl(var(--signal))' : 'hsl(var(--foreground))'}
                strokeOpacity={on ? 0.9 : 0.18}
                strokeDasharray="3 4"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        {points.map(p => {
          const x = xOf(p.start);
          const y = curve.at(x + 0.004);
          const on = active === p.exp.id;
          return (
            <button
              key={p.exp.id}
              type="button"
              onMouseEnter={() => onHover(p.exp.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(p.exp.id)}
              onBlur={() => onHover(null)}
              onClick={() => document.getElementById(`ckpt-${p.exp.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="group absolute -translate-x-1/2 -translate-y-1/2 p-2"
              style={{ left: `${x * 100}%`, top: `${(1 - y) * 100}%` }}
              aria-label={`${p.exp.company}, ${p.start}`}
            >
              <span className={cn('block h-2.5 w-2.5 rounded-full border transition-all duration-300', on ? 'scale-150 border-signal bg-signal' : 'border-foreground bg-background')} />
              <span
                className={cn(
                  'pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.12em] transition-opacity',
                  on ? 'text-signal opacity-100' : 'text-muted-foreground opacity-0 md:opacity-100',
                )}
              >
                ckpt_{String(p.index).padStart(2, '0')}
              </span>
            </button>
          );
        })}
      </div>
      <div className="relative mt-2 h-4 font-mono text-[10px] tabular text-muted-foreground">
        {years.map(y => (
          <span key={y} className={cn('absolute -translate-x-1/2', (y - y0) % 2 === 1 && 'hidden sm:inline')} style={{ left: `${xOf(y) * 100}%` }}>
            {y === y1 ? '' : `'${String(y).slice(2)}`}
          </span>
        ))}
      </div>
    </div>
  );
}

function Logo({ src, company }: { src: string; company: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line/20 font-mono text-[10px] text-muted-foreground">
        {company.charAt(0)}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-6 w-6 rounded-full bg-white object-contain p-[3px] grayscale transition duration-500 group-hover/row:grayscale-0"
    />
  );
}

export function ExperienceSection() {
  const { data, loading } = useSiteConfig();
  const [active, setActive] = useState<string | null>(null);
  const source = data?.experiences;
  const experiences = useMemo(() => source ?? [], [source]);

  const points: Checkpoint[] = useMemo(() => {
    const n = experiences.length;
    return experiences
      .map((exp, i) => {
        const y = yearsFromDuration(exp.duration);
        return { exp, index: n - i, start: y.start ?? new Date().getFullYear(), end: y.end, current: y.current };
      })
      .filter(p => Number.isFinite(p.start));
  }, [experiences]);

  return (
    <section id="work" className="relative z-10 bg-background pb-28 pt-12 md:pb-40" aria-label="Experience">
      <Container>
        <SectionHeader
          index={2}
          kicker="Experience"
          title="Training run"
          note="Each role is a checkpoint. Every new job is a warm restart; the loss keeps going down."
        />
        <div className="mt-16 md:mt-24 md:grid md:grid-cols-12 md:gap-x-8">
          <div className="md:col-span-9 md:col-start-4">
            {points.length > 1 && <LossCurve points={points} active={active} onHover={setActive} />}
          </div>
        </div>
        <ol className="mt-16 border-t border-line/20 md:mt-20">
          {loading && experiences.length === 0
            ? [...Array(3)].map((_, i) => (
                <li key={i} className="grid gap-4 border-b border-line/10 py-10 md:grid-cols-12">
                  <Skeleton className="h-4 w-24 md:col-span-3" />
                  <div className="space-y-3 md:col-span-6">
                    <Skeleton className="h-9 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </li>
              ))
            : points.map(p => {
                const on = active === p.exp.id;
                return (
                  <li
                    key={p.exp.id}
                    id={`ckpt-${p.exp.id}`}
                    onMouseEnter={() => setActive(p.exp.id)}
                    onMouseLeave={() => setActive(null)}
                    className={cn(
                      'group/row relative grid scroll-mt-32 gap-y-5 border-b border-line/10 py-10 transition-colors duration-500 md:grid-cols-12 md:gap-x-8 md:py-14',
                      on && 'bg-foreground/[0.025]',
                    )}
                  >
                    <span className={cn('absolute left-0 top-0 h-px bg-signal transition-all duration-700', on ? 'w-full' : 'w-0')} />
                    <div className="font-mono text-[11px] uppercase tracking-[0.14em] md:col-span-3">
                      <div className={cn('transition-colors', on ? 'text-signal' : 'text-muted-foreground')}>ckpt_{String(p.index).padStart(2, '0')}</div>
                      <div className="mt-2 text-foreground">
                        {p.start} — {p.current ? 'now' : p.end ?? ''}
                      </div>
                      <div className="mt-1 normal-case tracking-normal text-muted-foreground">{shortDuration(p.exp.duration)}</div>
                      <div className="mt-1 normal-case tracking-normal text-muted-foreground">{p.exp.location}</div>
                    </div>
                    <div className="md:col-span-6">
                      <h3 className="font-display text-[clamp(1.9rem,3.2vw,3rem)] leading-[1.02] tracking-[-0.015em] text-foreground">{p.exp.role}</h3>
                      <div className="mt-3 flex items-center gap-2.5 text-[0.95rem] text-foreground/80">
                        <Logo src={p.exp.logoUrl} company={p.exp.company} />
                        {p.exp.company}
                      </div>
                      <p className="mt-5 max-w-2xl text-[0.97rem] leading-relaxed text-foreground/65">{p.exp.description}</p>
                    </div>
                    <ul className="flex flex-wrap content-start gap-1.5 md:col-span-3 md:justify-end">
                      {p.exp.skills.map(skill => (
                        <li key={skill} className="rounded-full border border-line/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                          {skill}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
        </ol>
      </Container>
    </section>
  );
}
