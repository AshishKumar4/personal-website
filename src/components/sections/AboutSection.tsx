import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { PERSONAL_INFO } from '@/components/config/constants';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Container, SectionHeader } from '@/components/site/SectionHeader';
import { Reveal } from '@/components/site/Reveal';
import { DEFAULT_SITE_EXTRAS } from '@shared/types';

export function AboutSection() {
  const { config, loading } = useSiteConfig();
  const facts = config?.facts ?? DEFAULT_SITE_EXTRAS.facts;
  const portrait = config?.portraitUrl && config.portraitUrl !== PERSONAL_INFO.portrait ? config.portraitUrl : PERSONAL_INFO.profilePicture;

  return (
    <section id="about" className="relative pb-32 pt-40 md:pb-48 md:pt-56" aria-label="About">
      <Container>
        <SectionHeader label="About" />
        <div className="mt-10 grid grid-cols-1 gap-y-16 md:mt-14 md:grid-cols-12 md:gap-x-8">
          <div className="md:col-span-9 md:col-start-4">
            {loading && !config ? (
              <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full bg-white/5" />)}</div>
            ) : (
              <Reveal>
                <p className="font-display text-[clamp(1.6rem,2.9vw,2.75rem)] font-[420] leading-[1.18] tracking-[-0.025em] text-foreground text-pretty">
                  {config?.about}
                </p>
              </Reveal>
            )}
          </div>
          <div className="md:col-span-3 md:col-start-4">
            <Reveal>
              <div className="overflow-hidden rounded-2xl bg-card">
                <img
                  src={portrait}
                  alt={`Portrait of ${PERSONAL_INFO.name}`}
                  loading="lazy"
                  decoding="async"
                  onError={e => {
                    if (!e.currentTarget.src.endsWith(PERSONAL_INFO.portraitFallback)) e.currentTarget.src = PERSONAL_INFO.portraitFallback;
                  }}
                  className="aspect-[4/5] w-full object-cover object-[45%_30%]"
                />
              </div>
            </Reveal>
          </div>
          <div className="md:col-span-5 md:col-start-8">
            <Reveal delay={120}>
              <dl className="divide-y divide-white/10 border-y border-white/10">
                {facts.map(f => (
                  <div key={f.label} className="grid grid-cols-[9rem_1fr] gap-4 py-4 text-[0.9375rem]">
                    <dt className="text-foreground/45">{f.label}</dt>
                    <dd className="text-foreground/85">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <Link to="/about" className="group mt-8 inline-flex items-center gap-1.5 text-[0.9375rem] text-foreground transition-colors hover:text-signal">
                Read the longer story
                <ArrowUpRight size={15} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
