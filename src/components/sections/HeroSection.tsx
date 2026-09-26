import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PERSONAL_INFO } from '@/components/config/constants';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { HeroField } from '@/components/diffusion/HeroField';
import { SamplerHud } from '@/components/diffusion/SamplerHud';
import { ScrambleText } from '@/components/diffusion/ScrambleText';
import { sampler } from '@/lib/diffusion/sampler-store';
import { animateFavicon } from '@/lib/diffusion/favicon';
import { scrollToHash } from '@/lib/site-events';
import type { HeroLayout } from '@/lib/diffusion/compose';
import { DEFAULT_SITE_EXTRAS } from '@shared/types';

function SamplingStatus({ visible }: { visible: boolean }) {
  const stepRef = useRef<HTMLSpanElement>(null);
  const tRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    return sampler.subscribe(s => {
      if (stepRef.current) stepRef.current.textContent = `${String(s.step).padStart(2, '0')}/${s.steps}`;
      if (tRef.current) tRef.current.textContent = String(Math.round(s.t * 1000)).padStart(4, '0');
    });
  }, []);
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-8 z-20 flex justify-center transition-opacity duration-500',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3 rounded-full bg-black/80 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/90 backdrop-blur">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-signal" />
        sampling x ~ p(x | ashish)
        <span className="text-white/50">step <span ref={stepRef} className="tabular text-white">00/60</span></span>
        <span className="hidden text-white/50 sm:inline">t=<span ref={tRef} className="tabular text-white">1000</span></span>
      </div>
    </div>
  );
}

export function HeroSection() {
  const { config, loading, data } = useSiteConfig();
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [layout, setLayout] = useState<HeroLayout | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [waited, setWaited] = useState(false);
  const [past, setPast] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setWaited(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return sampler.subscribe(s => {
      if (s.phase === 'done' || (s.phase === 'sampling' && s.t < 0.5)) setRevealed(true);
    });
  }, []);

  useEffect(() => (reduced ? undefined : animateFavicon()), [reduced]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = Math.max(0, window.scrollY / Math.max(1, window.innerHeight));
      el.style.setProperty('--hero-p', p.toFixed(3));
      setPast(p > 1.02);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const configured = config?.portraitUrl || (!loading || waited ? PERSONAL_INFO.portrait : null);
  const portraitUrl = configured === PERSONAL_INFO.portrait && window.innerWidth < 700 ? PERSONAL_INFO.profilePicture : configured;
  const subtitle = config?.subtitle || 'I love building things.';
  const prompt = config?.heroPrompt || DEFAULT_SITE_EXTRAS.heroPrompt;
  const current = data?.experiences?.[0];
  const status = config?.now || (current ? `${current.role.split(',')[0]} · ${current.company}` : '');
  const wide = layout?.mode === 'wide';
  const show = revealed && !!layout;

  const textStyle: React.CSSProperties | undefined = layout
    ? { left: layout.padX, top: layout.nameBottom + (wide ? 28 : 20), maxWidth: wide ? Math.min(Math.max(layout.nameWidth * 0.8, 420), 600) : layout.w - layout.padX * 2 }
    : undefined;

  const fadeFast = { opacity: 'clamp(0, calc(1 - var(--hero-p, 0) * 2.4), 1)' } as React.CSSProperties;
  const fadeSlow = { opacity: 'clamp(0, calc(1.4 - var(--hero-p, 0) * 1.6), 1)' } as React.CSSProperties;

  return (
    <section ref={sectionRef} id="hero" className="relative h-[100svh] min-h-[560px] w-full" aria-label="Introduction">
      <HeroField name={PERSONAL_INFO.nameLines} portraitUrl={portraitUrl} reducedMotion={reduced} onLayout={setLayout} />
      <h1 className="sr-only">{PERSONAL_INFO.name}</h1>
      <SamplingStatus visible={!show && !reduced} />

      <div className={cn('fixed inset-x-0 top-0 h-[100lvh]', past && 'invisible')}>
        {layout && (
          <div className={cn('transition-opacity duration-700', show ? 'opacity-100' : 'opacity-0')}>
            <div
              className="pointer-events-none absolute font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
              style={{ left: layout.padX, top: Math.max(76, layout.nameTop - 30), ...fadeFast }}
            >
              {show ? <ScrambleText text="fig. 0 — a sample from p(x | ashish)" trigger="mount" duration={900} /> : null}
            </div>
            {wide && (
              <div
                className="pointer-events-none absolute font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/70"
                style={{ left: layout.portrait.x + layout.portrait.w * 0.36 + 18, top: 104, ...fadeFast }}
              >
                fig. 1 — this person exists
              </div>
            )}
          </div>
        )}

        {layout && (
          <div style={{ ...textStyle, ...fadeFast }} className="absolute">
            <div className={cn('transition-[opacity,transform] duration-1000 ease-out-expo', show ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0')}>
              <p className="font-display text-[clamp(1.5rem,2.4vw,2.35rem)] italic leading-[1.05] tracking-[-0.01em] text-foreground">
                {subtitle}
              </p>
              {config?.bio && (
                <p className={cn('mt-3 max-w-[36rem] text-[0.95rem] leading-relaxed text-foreground/70', wide ? 'line-clamp-4 [@media(min-height:860px)]:line-clamp-none' : 'line-clamp-3')}>
                  {config.bio}
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-[11px] uppercase tracking-[0.14em]">
                <button
                  onClick={() => scrollToHash('#contact')}
                  className="group inline-flex items-center gap-2 uppercase text-foreground transition-colors hover:text-signal"
                >
                  <span className="h-px w-6 bg-current transition-all duration-500 group-hover:w-10" />
                  Get in touch
                </button>
                <Link to="/about" className="group inline-flex items-center gap-1.5 text-foreground/70 transition-colors hover:text-foreground">
                  The longer story <ArrowUpRight size={12} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            'absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 px-5 pb-5 transition-opacity delay-500 duration-1000 sm:px-8 lg:px-12 lg:pb-8',
            show ? 'opacity-100' : 'opacity-0',
          )}
          style={{ bottom: 'calc(100lvh - 100svh)' }}
        >
          <button
            onClick={() => scrollToHash('#about')}
            style={fadeFast}
            className="group hidden items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-line/20 transition-colors group-hover:border-line/50">
              <ArrowDown size={12} className="transition-transform duration-500 group-hover:translate-y-0.5" />
            </span>
            <span className="flex flex-col items-start leading-snug">
              <span className="text-foreground">Scroll</span>
              <span>forward process q(x<sub>t</sub> | x<sub>0</sub>)</span>
            </span>
          </button>
          {status && wide && (
            <div style={fadeFast} className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground xl:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-signal" />
              Now: <span className="text-foreground/80">{status}</span>
            </div>
          )}
          <div style={fadeSlow} className={wide ? '' : 'w-full'}>
            {wide ? <SamplerHud prompt={prompt} /> : <SamplerHud prompt={prompt} compact className="w-full" />}
          </div>
        </div>
      </div>
    </section>
  );
}
