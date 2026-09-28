import { useLayoutEffect, useRef } from 'react';
import { PERSONAL_INFO } from '@/components/config/constants';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Container } from '@/components/site/SectionHeader';
import { useStageRegion } from '@/components/site/stage';
import { armIntro } from '@/components/flight/intro-gate';

export function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { config, data } = useSiteConfig();
  useStageRegion(ref, { kind: 'hero' });
  useLayoutEffect(armIntro, []);

  const current = data?.experiences?.[0];
  const [first, ...rest] = PERSONAL_INFO.nameLines;

  return (
    <section ref={ref} id="top" data-scene="night" aria-label="Introduction" className="hero relative flex h-[100svh] min-h-[600px] flex-col justify-end">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-background/85 via-background/35 to-transparent" />
      <div className="hero-body relative pb-9 md:pb-12">
        <Container>
          <h1 className="t-hero legible text-[clamp(3.6rem,20vw,6.5rem)] text-foreground sm:text-[clamp(4.5rem,10.4vw,12.25rem)]">
            <span className="sr-only">{PERSONAL_INFO.name}</span>
            <span aria-hidden="true">
              <span className="hero-line sm:hidden" style={{ animationDelay: '0.15s' }}>{first}</span>
              <span className="hero-line sm:hidden" style={{ animationDelay: '0.3s' }}>{rest[0]}</span>
              <span className="hero-line hidden sm:block" style={{ animationDelay: '0.15s' }}>{first} {rest[0]}</span>
              <span className="hero-line" style={{ animationDelay: '0.32s' }}>{rest[1]}</span>
            </span>
          </h1>
          <div className="hero-late mt-9 border-t border-foreground/15 pt-6 md:mt-12">
            <p className="legible max-w-md">
              {current && (
                <span className="block text-[1.125rem] font-[480] leading-snug tracking-[-0.01em] text-foreground" style={{ fontStretch: '106%' }}>
                  {current.role}, {current.company}
                </span>
              )}
              {config?.subtitle && <span className="t-narration mt-1 block text-[1.1875rem] italic leading-snug text-foreground/75">{config.subtitle}</span>}
            </p>
          </div>
        </Container>
      </div>
    </section>
  );
}
