import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { GitHubSnapshot, Project } from '@shared/types';
import { cn } from '@/lib/utils';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Container, SectionHeader } from '@/components/site/SectionHeader';
import { Reveal } from '@/components/site/Reveal';
import { RidgeArt } from '@/components/site/RidgeArt';
import { useStageRegion } from '@/components/site/stage';
import { SCENE_TONE, projectHue } from '@/components/site/story';
import { emitFlight } from '@/lib/flight/bus';
import { formatCount, repoStats } from '@/lib/site-data';
import { PERSONAL_INFO } from '@/components/config/constants';

function href(p: Project) {
  return p.url || (p.repo ? `https://github.com/${p.repo}` : undefined);
}

function Meta({ project, github, className }: { project: Project; github: GitHubSnapshot | null; className?: string }) {
  const stats = repoStats(github, project.repo);
  const parts = [stats?.language, stats && stats.stars > 0 ? `${formatCount(stats.stars)} stars` : null, project.repo || null].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return (
    <div className={cn('t-kicker flex flex-wrap gap-x-4 gap-y-1 normal-case tracking-[0.04em] text-foreground/45', className)}>
      {parts.map(p => <span key={p} className="truncate">{p}</span>)}
    </div>
  );
}

function Preview({ project, index, active }: { project: Project; index: number; active: boolean }) {
  const hue = projectHue(index);
  return (
    <div
      aria-hidden="true"
      className={cn(
        'absolute inset-0 transition-[opacity,transform,filter] duration-[900ms] ease-out-expo',
        active ? 'scale-100 opacity-100 blur-0' : 'scale-[1.04] opacity-0 blur-sm',
      )}
    >
      {project.imageUrl ? (
        <img src={project.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
      ) : (
        <RidgeArt seed={project.id} hue={hue} className="h-full w-full" />
      )}
    </div>
  );
}

export function ProjectsSection() {
  const ref = useRef<HTMLElement>(null);
  const { data, github, loading } = useSiteConfig();
  const projects = data?.projects ?? [];
  const [active, setActive] = useState(0);
  useStageRegion(ref, { kind: 'section', label: 'The work' });

  useEffect(() => () => emitFlight('focus', { hue: null }), []);

  const focus = (i: number) => {
    setActive(i);
    emitFlight('focus', { hue: projectHue(i), strength: 1 });
  };
  const blur = () => emitFlight('focus', { hue: null });
  const current = projects[active];

  return (
    <section
      ref={ref}
      id="work"
      data-scene="swarm"
      aria-label="The work"
      className="relative pb-32 pt-28 md:pb-44 md:pt-40"
      style={{ '--tone': SCENE_TONE.swarm } as React.CSSProperties}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/55 to-background/40" />
      <Container className="relative">
        <SectionHeader
          label="The work"
          title="Things I built to understand them."
          aside={
            <a href={`https://github.com/${PERSONAL_INFO.github}`} target="_blank" rel="noopener noreferrer" className="pill group">
              Everything on GitHub
              <ArrowUpRight size={13} className="opacity-60 transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px" />
            </a>
          }
        />
        <div className="mt-14 grid grid-cols-1 md:mt-20 lg:grid-cols-12 lg:gap-x-8">
          <ol className="work-list border-b border-foreground/10 lg:col-span-7" onMouseLeave={blur}>
            {loading && projects.length === 0
              ? [...Array(5)].map((_, i) => (
                  <li key={i} className="border-t border-foreground/10 py-6">
                    <Skeleton className="h-9 w-1/2 bg-foreground/5" />
                  </li>
                ))
              : projects.map((p, i) => {
                  const stats = repoStats(github, p.repo);
                  return (
                    <li key={p.id} className="work-row border-t border-foreground/10">
                      <a
                        href={href(p)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onMouseEnter={() => focus(i)}
                        onFocus={() => focus(i)}
                        onBlur={blur}
                        className="group grid grid-cols-[2.25rem_1fr_auto] items-baseline gap-x-3 py-5 md:grid-cols-[3rem_1fr_auto] md:py-6"
                      >
                        <span className={cn('font-mono text-[0.6875rem] tabular transition-colors duration-500', active === i ? 'text-[hsl(var(--tone))]' : 'text-foreground/35')}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="min-w-0">
                          <span className="work-name t-name legible block text-[clamp(1.75rem,3.3vw,3.25rem)] leading-[1.02] text-foreground transition-[color,transform] duration-500 ease-out-expo group-hover:translate-x-1.5">
                            {p.name}
                          </span>
                          <span className="t-narration mt-2.5 line-clamp-3 max-w-xl text-[1.0625rem] leading-relaxed text-foreground/60 lg:hidden">{p.description}</span>
                          <Meta project={p} github={github} className="mt-3 lg:hidden" />
                        </span>
                        <span className="flex items-center gap-3 font-mono text-[0.6875rem] text-foreground/45 tabular">
                          {stats && stats.stars > 0 && <span className="hidden sm:inline">{formatCount(stats.stars)}&thinsp;&#9733;</span>}
                          <ArrowUpRight size={16} className="text-foreground/35 transition-all duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                        </span>
                      </a>
                    </li>
                  );
                })}
          </ol>
          <div className="hidden lg:col-span-5 lg:block">
            <div className="sticky top-[18vh]">
              <Reveal>
                <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-card ring-1 ring-foreground/10">
                  {projects.map((p, i) => <Preview key={p.id} project={p} index={i} active={i === active} />)}
                  <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-foreground/[0.06]" />
                </div>
                {current && (
                  <div className="mt-6">
                    <div className="flex items-baseline justify-between gap-6">
                      <span className="t-kicker text-foreground/55">{String(active + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}</span>
                      <Meta project={current} github={github} className="justify-end" />
                    </div>
                    <p key={current.id} className="t-narration legible mt-4 text-[1.1875rem] leading-[1.5] text-foreground/80 animate-fade-in">{current.description}</p>
                  </div>
                )}
              </Reveal>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
