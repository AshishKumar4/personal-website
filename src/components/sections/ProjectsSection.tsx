import React, { useCallback } from 'react';
import { ArrowUpRight, GitFork, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GitHubSnapshot, Project } from '@shared/types';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Container, SectionHeader } from '@/components/site/SectionHeader';
import { DenoiseImage } from '@/components/diffusion/DenoiseImage';
import { formatCount, repoStats } from '@/lib/site-data';
import { hashString } from '@/lib/diffusion/noise';
import { MONO, SERIF } from '@/lib/diffusion/compose';
import { bentoRows } from '@/lib/bento';

const SPAN: Record<number, string> = {
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
  7: 'lg:col-span-7',
  12: 'lg:col-span-12',
};
const HEIGHT: Record<number, string> = {
  2: 'lg:h-[min(32vw,500px)]',
  3: 'lg:h-[min(24vw,340px)]',
  1: 'lg:h-[min(36vw,540px)]',
};

function layoutFor(n: number): { span: string; height: string }[] {
  return bentoRows(n).flatMap(row => row.map(span => ({ span: SPAN[span], height: HEIGHT[row.length] })));
}

function monogram(project: Project): string {
  const slug = (project.repo.split('/')[1] || project.name).trim();
  if (slug.length <= 8) return slug;
  const parts = slug.split(/[-_.\s]+/).filter(Boolean);
  return parts.length > 1 ? parts.slice(0, 2).map(p => p[0]).join('') : slug.slice(0, 2);
}

function cssColor(name: string, alpha = 1): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return `hsl(${v} / ${alpha})`;
}

function useProjectArt(project: Project) {
  return useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const seed = hashString(project.id);
    ctx.fillStyle = cssColor('--card');
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = cssColor('--foreground', 0.14);
    const step = 18;
    for (let x = step; x < w; x += step) {
      for (let y = step; y < h; y += step) ctx.fillRect(x, y, 1, 1);
    }
    const probe = monogram(project);
    ctx.font = `400 100px ${SERIF}`;
    const size = Math.min(h * 0.62, ((w * 0.7) / Math.max(1, ctx.measureText(probe).width)) * 100);
    ctx.font = `400 ${size}px ${SERIF}`;
    ctx.fillStyle = cssColor('--foreground');
    ctx.textBaseline = 'alphabetic';
    const mono = monogram(project);
    const mw = ctx.measureText(mono).width;
    const x = w * 0.5 - mw * 0.5;
    const y = h * 0.5 + size * 0.28;
    ctx.fillText(mono, x, y);
    ctx.fillStyle = cssColor('--signal');
    const r = Math.max(4, size * 0.05);
    ctx.beginPath();
    ctx.arc(x + mw + r * 1.8, y - r, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `400 10px ${MONO}`;
    ctx.fillStyle = cssColor('--foreground', 0.5);
    ctx.fillText('NO x₀ PROVIDED — SAMPLED FROM THE PRIOR', 14, 22);
    ctx.fillText(`${project.repo || project.name}`.toUpperCase(), 14, h - 14);
    ctx.textAlign = 'right';
    ctx.fillText(`SEED 0x${(seed & 0xffff).toString(16).toUpperCase().padStart(4, '0')}`, w - 14, h - 14);
    ctx.textAlign = 'left';
  }, [project]);
}

function SampleCard({ project, index, github, span, height }: { project: Project; index: number; github: GitHubSnapshot | null; span: string; height: string }) {
  const stats = repoStats(github, project.repo);
  const art = useProjectArt(project);

  return (
    <li className={cn('md:col-span-6', span)}>
      <a href={project.url || `https://github.com/${project.repo}`} target="_blank" rel="noopener noreferrer" className="group block">
        <DenoiseImage
          src={project.imageUrl || undefined}
          draw={project.imageUrl ? undefined : art}
          drawKey={project.id}
          alt={project.name}
          seed={hashString(project.id)}
          className={cn('aspect-[16/10] w-full border border-line/10 lg:aspect-auto', height)}
          imgClassName="transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.03]"
          latentWidth={112}
          focal={{ x: 0.5, y: 0.3 }}
        />
        <div className="mt-5 flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="text-signal">S/{String(index + 1).padStart(2, '0')}</span>
              {stats?.language && <span>{stats.language}</span>}
            </div>
            <h3 className="mt-2 font-display text-[clamp(1.75rem,2.4vw,2.5rem)] leading-[1.02] tracking-[-0.015em] text-foreground">
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-700 ease-out-expo group-hover:bg-[length:100%_1px]">
                {project.name}
              </span>
            </h3>
          </div>
          <span className="mt-6 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line/15 text-foreground transition-all duration-500 group-hover:border-signal group-hover:bg-signal group-hover:text-background">
            <ArrowUpRight size={15} />
          </span>
        </div>
        <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-foreground/65">{project.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] text-muted-foreground">
          {stats ? (
            <>
              <span className="inline-flex items-center gap-1.5 text-foreground/85"><Star size={12} className="text-signal" /> {formatCount(stats.stars)}</span>
              <span className="inline-flex items-center gap-1.5"><GitFork size={12} /> {formatCount(stats.forks)}</span>
            </>
          ) : null}
          {project.repo && <span className="truncate">{project.repo}</span>}
        </div>
      </a>
    </li>
  );
}

export function ProjectsSection() {
  const { data, github, loading } = useSiteConfig();
  const projects = data?.projects ?? [];
  const layout = layoutFor(projects.length);
  const skeleton = layoutFor(4);

  return (
    <section id="projects" className="relative z-10 bg-background pb-28 pt-12 md:pb-40" aria-label="Projects">
      <Container>
        <SectionHeader
          index={3}
          kicker="Projects"
          title="Samples"
          note="fig. 3 — uncurated samples at t = 0. hover any of them to inject a little noise."
        />
        <ul className="mt-16 grid grid-cols-1 gap-x-6 gap-y-16 md:mt-24 md:grid-cols-12 md:gap-y-20">
          {loading && projects.length === 0
            ? [...Array(4)].map((_, i) => (
                <li key={i} className={cn('md:col-span-6', skeleton[i].span)}>
                  <Skeleton className="aspect-[16/10] w-full rounded-none" />
                  <Skeleton className="mt-5 h-8 w-2/3" />
                  <Skeleton className="mt-3 h-4 w-full" />
                </li>
              ))
            : projects.map((project, i) => <SampleCard key={project.id} project={project} index={i} github={github} span={layout[i].span} height={layout[i].height} />)}
        </ul>
      </Container>
    </section>
  );
}
