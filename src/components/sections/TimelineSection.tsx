import React, { useEffect, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Experience, GitHubSnapshot, Project } from '@shared/types';
import { cn } from '@/lib/utils';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Container } from '@/components/site/SectionHeader';
import { Reveal } from '@/components/site/Reveal';
import { Words } from '@/components/site/Words';
import { useStageRegion } from '@/components/site/stage';
import { SCENE_TONE, buildTimeline, entryMotif, projectHue, type TimelineEntry } from '@/components/site/timeline';
import { emitFlight } from '@/lib/flight/bus';
import { formatCount, repoStats } from '@/lib/site-data';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function narrative(item: { story?: string; description: string }): string[] {
  const text = item.story?.trim() || item.description.trim();
  return text ? text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean) : [];
}

function yearLabel(year?: string) {
  const m = year?.trim().match(/^(\d{4})(?:-(\d{1,2}))?/);
  if (!m) return null;
  return m[2] ? `${MONTHS[Number(m[2]) - 1] ?? ''} ${m[1]}`.trim() : m[1];
}

function anchorId(id: string) {
  return `t-${id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function RailContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Container className={cn('lg:pr-48', className)}>{children}</Container>;
}

function ExperienceNode({ entry, item }: { entry: TimelineEntry; item: Experience }) {
  const node = useRef<HTMLElement>(null);
  const head = useRef<HTMLDivElement>(null);
  useStageRegion(node, { kind: 'node', id: entry.id, label: item.company.replace(/\s*\(.*\)$/, ''), year: entry.start, scene: entry.scene });
  useStageRegion(head, { kind: 'reveal', id: entry.id });

  return (
    <article
      ref={node}
      id={anchorId(entry.id)}
      data-scene={entry.scene}
      data-motif={entryMotif(entry.id)}
      data-seed={projectHue(entry.id).toFixed(4)}
      data-kind="experience"
      aria-label={item.company}
      className="relative"
      style={{ '--tone': SCENE_TONE[entry.scene] } as React.CSSProperties}
    >
      <div ref={head} className="reveal-title flex min-h-[84svh] items-end pb-8 md:min-h-[96svh] md:pb-12">
        <RailContainer>
          <div className="t-kicker legible flex items-center gap-4 text-foreground/70">
            <span className="text-[hsl(var(--tone))]">{item.duration}</span>
            <span aria-hidden="true" className="reveal-rule hidden h-px w-14 bg-foreground/35 sm:block" />
          </div>
          <Words as="h3" text={item.company} className="t-scene mt-5 max-w-[15ch] text-[clamp(2.6rem,7.2vw,7.5rem)] leading-[0.94] text-foreground text-balance md:mt-7" />
          <div className="reveal-sub legible mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2 md:mt-8">
            <span className="text-[1.0625rem] font-[450] text-foreground/90" style={{ fontStretch: '106%' }}>{item.role}</span>
            {item.location && <span className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-foreground/50">{item.location}</span>}
          </div>
        </RailContainer>
      </div>
      <div className="relative pb-[34svh] pt-4 md:pb-[42svh]">
        <div aria-hidden="true" className="veil-left pointer-events-none absolute inset-x-0 -top-10 bottom-0" />
        <RailContainer className="relative">
          <div className="grid grid-cols-1 gap-y-10 md:grid-cols-12 md:gap-x-8">
            {narrative(item).length > 0 && (
              <Reveal className="md:col-span-8 lg:col-span-7">
                <div className="space-y-5">
                  {narrative(item).map((para, i) => (
                    <p key={i} className="t-narration legible text-[clamp(1.125rem,1.3vw,1.25rem)] leading-[1.62] text-foreground/85 text-pretty">{para}</p>
                  ))}
                </div>
              </Reveal>
            )}
            {item.skills.length > 0 && (
              <Reveal delay={140} className="md:col-span-4 lg:col-span-4 lg:col-start-9">
                <ul className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-foreground/50 md:block md:space-y-2.5">
                  {item.skills.map(s => (
                    <li key={s} className="legible">{s}</li>
                  ))}
                </ul>
              </Reveal>
            )}
          </div>
        </RailContainer>
      </div>
    </article>
  );
}

function ProjectNode({ entry, item, github, flip }: { entry: TimelineEntry; item: Project; github: GitHubSnapshot | null; flip: boolean }) {
  const node = useRef<HTMLElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLDivElement>(null);
  useStageRegion(node, { kind: 'node', id: entry.id, label: item.name, year: entry.start, scene: entry.scene });
  useStageRegion(head, { kind: 'reveal', id: entry.id });
  useStageRegion(image, { kind: 'reveal', anchor: 'top', span: 0.75 });

  const stats = repoStats(github, item.repo);
  const href = item.url || (item.repo ? `https://github.com/${item.repo}` : undefined);
  const repoHref = item.repo ? `https://github.com/${item.repo}` : undefined;
  const hasImage = Boolean(item.imageUrl);
  const when = yearLabel(item.year);

  const focus = () => emitFlight('focus', { hue: projectHue(item.id), strength: 1 });
  const blur = () => emitFlight('focus', { hue: null });

  return (
    <article
      ref={node}
      id={anchorId(entry.id)}
      data-scene={entry.scene}
      data-motif={entryMotif(entry.id)}
      data-seed={projectHue(entry.id).toFixed(4)}
      data-kind="project"
      aria-label={item.name}
      onMouseEnter={focus}
      onMouseLeave={blur}
      className="relative py-[24svh] md:py-[30svh]"
      style={{ '--tone': SCENE_TONE[entry.scene] } as React.CSSProperties}
    >
      <RailContainer>
        <div className="grid grid-cols-1 gap-y-10 md:grid-cols-12 md:items-end md:gap-x-8">
          {hasImage && (
            <div ref={image} className={cn('reveal-image md:col-span-7', flip ? 'md:col-start-6 md:row-start-1' : 'md:col-start-1')}>
              <a href={href} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true" className="block overflow-hidden rounded-md bg-foreground/[0.03] ring-1 ring-foreground/10">
                <img src={item.imageUrl} alt="" loading="lazy" decoding="async" className="aspect-[16/10] w-full object-cover object-top" />
              </a>
            </div>
          )}
          <div
            ref={head}
            className={cn(
              'reveal-title scrim',
              hasImage ? (flip ? 'md:col-span-4 md:col-start-1 md:row-start-1' : 'md:col-span-4 md:col-start-9') : flip ? 'md:col-span-6 md:col-start-2' : 'md:col-span-6 md:col-start-7',
            )}
          >
            <div className="t-kicker legible flex items-center gap-3 text-foreground/60">
              <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 bg-[hsl(var(--tone))]" />
              <span className="text-foreground/80">Project</span>
              {when && <span>{when}</span>}
            </div>
            <Words as="h3" text={item.name} wdth="114%" className="t-name mt-4 text-[clamp(2.1rem,3.6vw,3.5rem)] leading-[1] text-foreground" />
            <div className="reveal-sub">
              {narrative(item).map((para, i) => (
                <p key={i} className="t-narration legible mt-5 text-[1.0625rem] leading-[1.6] text-foreground/80 text-pretty">{para}</p>
              ))}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                {(href || repoHref) && (
                  <a href={repoHref ?? href} target="_blank" rel="noopener noreferrer" className="pill group">
                    {repoHref ? 'GitHub' : 'Visit'}
                    <ArrowUpRight size={13} className="opacity-60 transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px" />
                  </a>
                )}
                {(stats?.language || (stats && stats.stars > 0)) && (
                  <span className="t-kicker legible flex gap-4 normal-case tracking-[0.04em] text-foreground/50 tabular">
                    {stats?.language && <span>{stats.language}</span>}
                    {stats && stats.stars > 0 && <span>{formatCount(stats.stars)} stars</span>}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </RailContainer>
    </article>
  );
}

function spanLabel(items: Project[]) {
  const first = yearLabel(items[0]?.year);
  const last = yearLabel(items[items.length - 1]?.year);
  if (!first || !last || first === last) return first ?? last;
  const [fm, fy] = first.split(' ');
  const [lm, ly] = last.split(' ');
  return fy && ly && fy === ly ? `${fm} to ${lm} ${ly}` : `${first} to ${last}`;
}

function GroupCard({ item, github }: { item: Project; github: GitHubSnapshot | null }) {
  const stats = repoStats(github, item.repo);
  const href = item.url || (item.repo ? `https://github.com/${item.repo}` : undefined);
  const repoHref = item.repo ? `https://github.com/${item.repo}` : undefined;
  const focus = () => emitFlight('focus', { hue: projectHue(item.id), strength: 1 });
  const blur = () => emitFlight('focus', { hue: null });
  return (
    <div id={anchorId(item.id)} onMouseEnter={focus} onMouseLeave={blur} className="scrim">
      <Words as="h3" text={item.name} wdth="114%" className="t-name text-[clamp(1.9rem,2.7vw,2.75rem)] leading-[1] text-foreground" />
      <div className="reveal-sub">
        {narrative(item).map((para, i) => (
          <p key={i} className="t-narration legible mt-5 text-[1.0625rem] leading-[1.6] text-foreground/80 text-pretty">{para}</p>
        ))}
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          {(href || repoHref) && (
            <a href={repoHref ?? href} target="_blank" rel="noopener noreferrer" className="pill group">
              {repoHref ? 'GitHub' : 'Visit'}
              <ArrowUpRight size={13} className="opacity-60 transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px" />
            </a>
          )}
          {(stats?.language || (stats && stats.stars > 0)) && (
            <span className="t-kicker legible flex gap-4 normal-case tracking-[0.04em] text-foreground/50 tabular">
              {stats?.language && <span>{stats.language}</span>}
              {stats && stats.stars > 0 && <span>{formatCount(stats.stars)} stars</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupNode({ entry, items, lead, github }: { entry: TimelineEntry; items: Project[]; lead: Project; github: GitHubSnapshot | null }) {
  const node = useRef<HTMLElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const label = items.map(p => p.name).join(', ');
  useStageRegion(node, { kind: 'node', id: entry.id, label, year: entry.start, scene: entry.scene });
  useStageRegion(head, { kind: 'reveal', id: entry.id, anchor: 'top', span: 0.45 });
  const when = spanLabel(items);

  return (
    <article
      ref={node}
      id={anchorId(entry.id)}
      data-scene={entry.scene}
      data-motif={entryMotif(lead.id)}
      data-seed={projectHue(lead.id).toFixed(4)}
      data-kind="group"
      aria-label={label}
      className="relative py-[24svh] md:py-[30svh]"
      style={{ '--tone': SCENE_TONE[entry.scene] } as React.CSSProperties}
    >
      <RailContainer>
        <div ref={head} className="reveal-title">
          <div className="t-kicker legible flex items-center gap-3 text-foreground/60">
            <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 bg-[hsl(var(--tone))]" />
            <span className="text-foreground/80">Projects</span>
            {when && <span>{when}</span>}
          </div>
          <div className="mt-8 grid grid-cols-1 gap-y-14 md:mt-10 md:grid-cols-3 md:gap-x-10">
            {items.map(item => (
              <GroupCard key={item.id} item={item} github={github} />
            ))}
          </div>
        </div>
      </RailContainer>
    </article>
  );
}

export function TimelineSection() {
  const { data, github } = useSiteConfig();
  const entries = data ? buildTimeline(data.experiences, data.projects) : [];

  useEffect(() => () => emitFlight('focus', { hue: null }), []);

  let projectIndex = 0;
  return (
    <div id="timeline" className="relative overflow-x-clip">
      {entries.map(entry =>
        entry.kind === 'experience' ? (
          <ExperienceNode key={`e-${entry.id}`} entry={entry} item={entry.item} />
        ) : entry.kind === 'group' ? (
          <GroupNode key={`g-${entry.id}`} entry={entry} items={entry.items} lead={entry.lead} github={github} />
        ) : (
          <ProjectNode key={`p-${entry.id}`} entry={entry} item={entry.item} github={github} flip={projectIndex++ % 2 === 1} />
        ),
      )}
    </div>
  );
}
