import { ArrowUpRight } from 'lucide-react';
import type { GitHubSnapshot, Project } from '@shared/types';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Container, SectionHeader } from '@/components/site/SectionHeader';
import { Reveal } from '@/components/site/Reveal';
import { RidgeArt } from '@/components/site/RidgeArt';
import { formatCount, repoStats } from '@/lib/site-data';

function ProjectCard({ project, github, index }: { project: Project; github: GitHubSnapshot | null; index: number }) {
  const stats = repoStats(github, project.repo);
  const href = project.url || (project.repo ? `https://github.com/${project.repo}` : undefined);
  return (
    <Reveal as="li" delay={(index % 2) * 90}>
      <a href={href} target="_blank" rel="noopener noreferrer" className="group block">
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-card ring-1 ring-white/[0.07]">
          {project.imageUrl ? (
            <img
              src={project.imageUrl}
              alt={project.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-top transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.035]"
            />
          ) : (
            <RidgeArt seed={project.id} className="h-full w-full transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.035]" />
          )}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.06]" />
        </div>
        <div className="mt-5 flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h3 className="font-display text-[1.45rem] font-[520] leading-tight tracking-[-0.025em] text-foreground">{project.name}</h3>
            <p className="mt-2 max-w-xl text-[0.9375rem] leading-relaxed text-foreground/55">{project.description}</p>
          </div>
          <ArrowUpRight size={18} className="mt-1.5 shrink-0 text-foreground/40 transition-all duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
        {(stats || project.repo) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-foreground/40 tabular">
            {stats?.language && <span>{stats.language}</span>}
            {stats && stats.stars > 0 && <span>{formatCount(stats.stars)} stars</span>}
            {project.repo && <span className="truncate">{project.repo}</span>}
          </div>
        )}
      </a>
    </Reveal>
  );
}

export function ProjectsSection() {
  const { data, github, loading } = useSiteConfig();
  const projects = data?.projects ?? [];

  return (
    <section id="work" className="relative pb-32 md:pb-48" aria-label="Selected work">
      <Container>
        <SectionHeader label="Selected work" title="Things I built to understand them." aside={projects.length ? `${projects.length} projects` : undefined} />
        <ul className="mt-14 grid grid-cols-1 gap-x-8 gap-y-16 md:mt-20 md:grid-cols-2 md:gap-y-20">
          {loading && projects.length === 0
            ? [...Array(4)].map((_, i) => (
                <li key={i}>
                  <Skeleton className="aspect-[16/10] w-full rounded-2xl bg-white/5" />
                  <Skeleton className="mt-5 h-7 w-1/2 bg-white/5" />
                </li>
              ))
            : projects.map((p, i) => <ProjectCard key={p.id} project={p} github={github} index={i} />)}
        </ul>
      </Container>
    </section>
  );
}
