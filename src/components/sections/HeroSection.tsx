import React, { useRef } from 'react';
import { PERSONAL_INFO } from '@/components/config/constants';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Container } from '@/components/site/SectionHeader';
import { useStageRegion } from '@/components/site/stage';
import { resolveStory } from '@/components/site/story';
import { emitFlight } from '@/lib/flight/bus';
import { scrollToHash } from '@/lib/site-events';

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

export function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { config, data } = useSiteConfig();
  useStageRegion(ref, { kind: 'hero', label: 'Prologue' });

  const chapters = resolveStory(config).length;
  const current = data?.experiences?.[0];
  const company = current?.company.replace(/\s*\(.*\)$/, '');
  const role = current?.role.split(',')[0];
  const headline = config?.now || (current ? `${role} at ${company}.` : 'Systems engineer at Cloudflare.');
  const subtitle = config?.subtitle || 'I build things from scratch to understand them.';
  const [first, ...rest] = PERSONAL_INFO.nameLines;

  return (
    <section ref={ref} id="top" data-scene="night" aria-label="Introduction" className="hero relative flex h-[100svh] min-h-[600px] flex-col justify-end">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-background/90 via-background/45 to-transparent" />
      <div className="hero-body relative pb-9 md:pb-12">
        <Container>
          <div className="hero-late t-kicker legible mb-7 flex items-center gap-4 text-foreground/60 md:mb-9">
            <span className="hidden text-foreground/85 sm:inline">Prologue</span>
            <span aria-hidden="true" className="hidden h-px w-10 bg-foreground/30 sm:block" />
            <span>A night flight in {WORDS[chapters] ?? chapters} chapters</span>
          </div>
          <h1 className="t-hero legible text-[clamp(3.6rem,20vw,6.5rem)] text-foreground sm:text-[clamp(4.5rem,10.4vw,12.25rem)]">
            <span className="sr-only">{PERSONAL_INFO.name}</span>
            <span aria-hidden="true">
              <span className="hero-line sm:hidden" style={{ animationDelay: '0.15s' }}>{first}</span>
              <span className="hero-line sm:hidden" style={{ animationDelay: '0.3s' }}>{rest[0]}</span>
              <span className="hero-line hidden sm:block" style={{ animationDelay: '0.15s' }}>{first} {rest[0]}</span>
              <span className="hero-line" style={{ animationDelay: '0.32s' }}>{rest[1]}</span>
            </span>
          </h1>
          <div className="hero-late mt-9 grid grid-cols-1 gap-y-8 border-t border-foreground/15 pt-6 md:mt-12 md:grid-cols-12 md:gap-x-8">
            <p className="legible max-w-md md:col-span-5">
              <span className="block text-[1.125rem] font-[480] leading-snug tracking-[-0.01em] text-foreground" style={{ fontStretch: '106%' }}>{headline}</span>
              <span className="t-narration mt-1 block text-[1.1875rem] italic leading-snug text-foreground/70">{subtitle}</span>
            </p>
            <div className="flex items-start gap-4 md:col-span-4 md:col-start-6">
              <button
                type="button"
                onClick={() => emitFlight('free', true)}
                className="group inline-flex h-11 items-center gap-3 rounded-full border border-foreground/20 bg-background/30 pl-2 pr-5 text-[0.9375rem] font-[480] text-foreground backdrop-blur-sm transition-colors duration-500 hover:border-foreground/50 hover:bg-foreground/[0.06]"
              >
                <Reticle />
                Take the controls
              </button>
              <span className="t-kicker hidden pt-3.5 text-foreground/45 lg:block">Esc to land</span>
            </div>
            <div className="hidden items-start justify-end md:col-span-3 md:flex">
              <button
                type="button"
                onClick={() => scrollToHash('#story')}
                className="t-kicker group flex items-center gap-4 pt-3.5 text-foreground/60 transition-colors hover:text-foreground"
              >
                Scroll to fly
                <span aria-hidden="true" className="relative -mt-1 block h-10 w-px overflow-hidden bg-foreground/15">
                  <span className="scroll-cue absolute inset-0 bg-foreground/80" />
                </span>
              </button>
            </div>
          </div>
        </Container>
      </div>
    </section>
  );
}

function Reticle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-500 group-hover:rotate-90">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" {...props}>
        <circle cx="7" cy="7" r="3.25" stroke="currentColor" strokeWidth="1.3" />
        <path d="M7 0v2.5M7 11.5V14M0 7h2.5M11.5 7H14" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    </span>
  );
}
