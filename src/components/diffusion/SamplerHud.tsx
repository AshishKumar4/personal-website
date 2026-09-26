import { useEffect, useMemo, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sampler } from '@/lib/diffusion/sampler-store';
import { heroX0 } from '@/lib/diffusion/hero-x0';
import { hex, noiseScale, schedulePath, TIMESTEPS } from '@/lib/diffusion/schedule';

interface SamplerHudProps {
  prompt: string;
  compact?: boolean;
  className?: string;
}

const PLOT_W = 132;
const PLOT_H = 34;

export function SamplerHud({ prompt, compact = false, className }: SamplerHudProps) {
  const tRef = useRef<HTMLSpanElement>(null);
  const sigmaRef = useRef<HTMLSpanElement>(null);
  const stepRef = useRef<HTMLSpanElement>(null);
  const seedRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const thumbRef = useRef<HTMLCanvasElement>(null);
  const path = useMemo(() => schedulePath(PLOT_W, PLOT_H), []);

  useEffect(() => {
    let lastThumb = { step: -1, version: -1 };
    return sampler.subscribe(s => {
      const tInt = Math.round(s.t * TIMESTEPS);
      const sigma = noiseScale(s.t);
      if (tRef.current) tRef.current.textContent = String(tInt).padStart(4, '0');
      if (sigmaRef.current) sigmaRef.current.textContent = sigma.toFixed(3);
      if (stepRef.current) stepRef.current.textContent = `${String(s.step).padStart(2, '0')}/${s.steps}`;
      if (seedRef.current) seedRef.current.textContent = `0x${hex(s.seed)}`;
      if (statusRef.current) {
        const label = s.phase === 'sampling' ? 'sampling' : s.phase === 'done' ? (s.scroll > 0.02 ? 'forward q(x_t|x_0)' : `ready · ${(s.elapsedMs / 1000).toFixed(2)}s`) : 'loading';
        statusRef.current.textContent = label;
        statusRef.current.dataset.phase = s.phase;
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${1 - s.t})`;
      if (dotRef.current) {
        dotRef.current.setAttribute('cx', (s.t * PLOT_W).toFixed(1));
        dotRef.current.setAttribute('cy', (PLOT_H - sigma * PLOT_H).toFixed(1));
      }
      const thumb = thumbRef.current;
      if (thumb && heroX0.canvas && (s.step !== lastThumb.step || heroX0.version !== lastThumb.version)) {
        lastThumb = { step: s.step, version: heroX0.version };
        const c = thumb.getContext('2d');
        if (c) {
          const src = heroX0.canvas;
          c.filter = `blur(${(sigma * 7).toFixed(2)}px)`;
          c.globalAlpha = 1;
          c.fillStyle = '#000';
          c.fillRect(0, 0, thumb.width, thumb.height);
          const scale = Math.max(thumb.width / src.width, thumb.height / src.height);
          const dw = src.width * scale;
          const dh = src.height * scale;
          c.drawImage(src, (thumb.width - dw) / 2, (thumb.height - dh) / 2, dw, dh);
          c.filter = 'none';
        }
      }
    });
  }, []);

  const resample = () => sampler.command({ type: 'resample' });

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 font-mono text-[10px] tracking-[0.08em] text-muted-foreground', className)}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inset-0 animate-pulse-dot rounded-full bg-signal" />
        </span>
        <span>t=<span ref={tRef} className="tabular text-foreground">1000</span></span>
        <span>σ=<span ref={sigmaRef} className="tabular text-foreground">1.000</span></span>
        <span className="hidden min-[380px]:inline">seed <span ref={seedRef} className="tabular text-foreground">0x0000</span></span>
        <button onClick={resample} className="ml-auto inline-flex items-center gap-1.5 text-foreground hover:text-signal" aria-label="Resample the hero from noise">
          <RotateCcw size={11} /> resample
        </button>
        <span ref={stepRef} className="hidden" />
        <span ref={statusRef} className="hidden" />
      </div>
    );
  }

  return (
    <div className={cn('w-[344px] border border-line/15 bg-background/55 font-mono text-[10.5px] leading-[1.55] text-muted-foreground backdrop-blur-md', className)}>
      <div className="flex items-center justify-between border-b border-line/10 px-3 py-2 uppercase tracking-[0.14em]">
        <span className="text-foreground">Sampler</span>
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal" />
          <span ref={statusRef} className="normal-case tracking-normal">loading</span>
        </span>
      </div>
      <div className="flex gap-3 px-3 pt-3">
        <div className="relative shrink-0">
          <canvas ref={thumbRef} width={112} height={72} className="block h-[72px] w-[112px] border border-line/10 bg-black" aria-hidden="true" />
          <span className="absolute -bottom-4 left-0 text-[9px] tracking-[0.14em]">
            <span className="relative inline-block">x<span className="absolute -top-[0.38em] left-0 w-full text-center">ˆ</span></span><sub>0</sub> PREDICTION
          </span>
        </div>
        <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          <dt>t</dt>
          <dd className="text-right text-foreground"><span ref={tRef} className="tabular">1000</span><span className="text-muted-foreground">/{TIMESTEPS}</span></dd>
          <dt>σ<sub>t</sub></dt>
          <dd className="tabular text-right text-foreground"><span ref={sigmaRef}>1.000</span></dd>
          <dt>step</dt>
          <dd className="tabular text-right text-foreground"><span ref={stepRef}>00/60</span></dd>
          <dt>seed</dt>
          <dd className="tabular text-right text-foreground"><span ref={seedRef}>0x0000</span></dd>
        </dl>
      </div>
      <div className="mt-6 flex items-end justify-between gap-3 px-3">
        <svg width={PLOT_W} height={PLOT_H + 2} viewBox={`0 -1 ${PLOT_W} ${PLOT_H + 2}`} className="overflow-visible" aria-hidden="true">
          <line x1="0" y1={PLOT_H} x2={PLOT_W} y2={PLOT_H} stroke="currentColor" strokeOpacity="0.25" />
          <path d={path} fill="none" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1" />
          <circle ref={dotRef} r="2.5" cx={PLOT_W} cy="0" className="fill-signal" />
        </svg>
        <div className="text-right text-[9.5px] leading-tight">
          <div>DDIM · 60 steps</div>
          <div>cosine schedule</div>
          <div>ε-pred · η 0.4 → 0</div>
        </div>
      </div>
      <div className="mt-3 h-px w-full bg-line/10">
        <span ref={barRef} className="block h-px origin-left bg-signal" style={{ transform: 'scaleX(0)' }} />
      </div>
      <div className="flex items-start justify-between gap-3 px-3 py-2.5">
        <p className="line-clamp-2 normal-case">
          <span className="text-foreground">prompt:</span> "{prompt}"
        </p>
        <button
          onClick={resample}
          className="group inline-flex shrink-0 items-center gap-1.5 uppercase tracking-[0.12em] text-foreground transition-colors hover:text-signal"
          aria-label="Resample the hero from noise"
        >
          <RotateCcw size={11} className="transition-transform duration-500 group-hover:-rotate-180" />
          Resample
        </button>
      </div>
    </div>
  );
}
