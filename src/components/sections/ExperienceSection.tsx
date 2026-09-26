import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Container, SectionHeader } from '@/components/site/SectionHeader';
import { Reveal } from '@/components/site/Reveal';
import { useStageRegion } from '@/components/site/stage';
import { yearsFromDuration } from '@/lib/site-data';

export function ExperienceSection() {
  const ref = useRef<HTMLElement>(null);
  const { data, loading } = useSiteConfig();
  const experiences = data?.experiences ?? [];
  useStageRegion(ref, { kind: 'section', label: 'Flight log' });

  return (
    <section ref={ref} id="experience" data-scene="night" aria-label="Flight log" className="relative pb-32 pt-12 md:pb-44">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-background/40" />
      <Container className="relative">
        <SectionHeader
          label="Flight log"
          title="Where the hours went."
          aside={
            <Link to="/about" className="pill group">
              The longer story
              <ArrowUpRight size={13} className="opacity-60 transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px" />
            </Link>
          }
        />
        <ol className="mt-14 border-b border-foreground/10 md:mt-20">
          {loading && experiences.length === 0
            ? [...Array(3)].map((_, i) => (
                <li key={i} className="grid gap-4 border-t border-foreground/10 py-8 md:grid-cols-12">
                  <Skeleton className="h-4 w-24 bg-foreground/5 md:col-span-2" />
                  <Skeleton className="h-8 w-2/3 bg-foreground/5 md:col-span-6" />
                </li>
              ))
            : experiences.map(exp => {
                const y = yearsFromDuration(exp.duration);
                const company = exp.company.replace(/\s*\(.*\)$/, '');
                const note = exp.company.match(/\((.*)\)$/)?.[1];
                return (
                  <Reveal as="li" key={exp.id} className="grid grid-cols-[4.25rem_1fr] gap-x-4 gap-y-4 border-t border-foreground/10 py-7 md:grid-cols-12 md:gap-x-8 md:py-9">
                    <div className="font-mono text-[0.75rem] leading-[1.7] text-foreground/45 tabular md:col-span-2">
                      {y.start ? (
                        <>
                          <span className="block text-foreground/90">{y.current ? 'Now' : y.end}</span>
                          <span className="block">{y.start}</span>
                        </>
                      ) : (
                        exp.duration
                      )}
                    </div>
                    <div className="min-w-0 md:col-span-4">
                      <h3 className="t-name legible text-[clamp(1.375rem,2vw,1.75rem)] leading-[1.1] text-foreground text-balance">{company}</h3>
                      <div className="mt-2 text-[0.9375rem] leading-snug text-foreground/70">
                        {exp.role}
                        {note && <span className="text-foreground/45">, {note}</span>}
                      </div>
                      <div className="t-kicker mt-3 text-foreground/40">{exp.location.split('·')[0].replace(/, United States$/, '').trim()}</div>
                    </div>
                    <p className="t-narration col-start-2 line-clamp-4 max-w-[62ch] text-[1.0625rem] leading-[1.55] text-foreground/60 text-pretty md:col-span-6 md:col-start-auto md:pt-1">{exp.description}</p>
                  </Reveal>
                );
              })}
        </ol>
      </Container>
    </section>
  );
}
