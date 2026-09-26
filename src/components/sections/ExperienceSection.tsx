import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Container, SectionHeader } from '@/components/site/SectionHeader';
import { Reveal } from '@/components/site/Reveal';
import { yearsFromDuration } from '@/lib/site-data';

export function ExperienceSection() {
  const { data, loading } = useSiteConfig();
  const experiences = data?.experiences ?? [];

  return (
    <section id="experience" className="relative pb-32 md:pb-48" aria-label="Experience">
      <Container>
        <SectionHeader label="Experience" title="A decade of building, from kernels to agents." />
        <ol className="mt-14 md:mt-20">
          {loading && experiences.length === 0
            ? [...Array(3)].map((_, i) => (
                <li key={i} className="grid gap-4 border-t border-white/10 py-8 md:grid-cols-12">
                  <Skeleton className="h-4 w-24 bg-white/5 md:col-span-3" />
                  <Skeleton className="h-8 w-2/3 bg-white/5 md:col-span-6" />
                </li>
              ))
            : experiences.map(exp => {
                const y = yearsFromDuration(exp.duration);
                const range = y.start ? `${y.start} — ${y.current ? 'Now' : y.end ?? ''}` : exp.duration;
                return (
                  <Reveal as="li" key={exp.id} className="group grid grid-cols-1 gap-y-3 border-t border-white/10 py-9 md:grid-cols-12 md:gap-x-8 md:py-11">
                    <div className="text-[0.875rem] text-foreground/45 tabular md:col-span-3">{range}</div>
                    <div className="md:col-span-6">
                      <h3 className="font-display text-[1.5rem] font-[500] leading-snug tracking-[-0.02em] text-foreground">
                        {exp.role}
                      </h3>
                      <div className="mt-1 text-[0.9375rem] text-foreground/60">{exp.company}</div>
                      <p className="mt-5 max-w-2xl text-[0.9375rem] leading-relaxed text-foreground/55">{exp.description}</p>
                    </div>
                    <div className="text-[0.875rem] text-foreground/45 md:col-span-3 md:text-right">
                      <div>{exp.location.split('·')[0].trim()}</div>
                      {exp.skills.length > 0 && <div className="mt-3 leading-relaxed text-foreground/35">{exp.skills.join(' · ')}</div>}
                    </div>
                  </Reveal>
                );
              })}
        </ol>
      </Container>
    </section>
  );
}
