import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { PERSONAL_INFO, SOCIAL_LINKS } from '@/components/config/constants';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Container, SectionHeader } from '@/components/site/SectionHeader';
import { ScrollWords } from '@/components/diffusion/ScrollWords';
import { ForwardProcessWidget } from '@/components/diffusion/ForwardProcessWidget';
import { formatCount } from '@/lib/site-data';
import { DEFAULT_SITE_EXTRAS } from '@shared/types';

export function AboutSection() {
  const { config, data, github, loading } = useSiteConfig();
  const current = data?.experiences?.[0];
  const facts = config?.facts ?? DEFAULT_SITE_EXTRAS.facts;
  const location = config?.location || current?.location?.split('·')[0].trim() || '';
  const diffusionPost = data?.posts.find(p => /diffusion/i.test(p.slug));
  const totalStars = github ? Object.values(github.repos).reduce((sum, r) => sum + r.stars, 0) : null;

  const rows: [string, React.ReactNode][] = [
    ['Name', PERSONAL_INFO.name],
    ...(current ? [['Role', `${current.role} · ${current.company}`] as [string, React.ReactNode]] : []),
    ...(location ? [['Based in', location] as [string, React.ReactNode]] : []),
    ...facts.map(f => [f.label, f.value] as [string, React.ReactNode]),
    ...(totalStars !== null && totalStars > 0 ? [['Stars earned', `${formatCount(totalStars)} across featured repos`] as [string, React.ReactNode]] : []),
    [
      'Weights',
      <span className="flex flex-wrap gap-x-4 gap-y-1">
        {SOCIAL_LINKS.map(s => (
          <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="link-underline text-foreground hover:text-signal">
            {s.name}
          </a>
        ))}
      </span>,
    ],
  ];

  return (
    <section id="about" className="relative z-10 bg-background pb-28 pt-24 md:pb-40 md:pt-32" aria-labelledby="about-title">
      <Container>
        <SectionHeader index={1} kicker="About" title="Model card" note={`ashish-kumar-singh · a generative model of one person · checkpoint ${new Date().getFullYear()}`} />
        <div className="mt-16 grid grid-cols-1 gap-16 md:mt-24 md:grid-cols-12 md:gap-x-8">
          <div className="md:col-span-7 md:col-start-4 lg:col-span-6 lg:col-start-4">
            <h3 id="about-title" className="label mb-6">Abstract</h3>
            {loading && !config ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <ScrollWords
                text={config?.about ?? ''}
                className="font-display text-[clamp(1.75rem,3.1vw,3rem)] leading-[1.12] tracking-[-0.012em] text-foreground"
              />
            )}
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-[0.14em]">
              <Link to="/about" className="group inline-flex items-center gap-1.5 text-foreground hover:text-signal">
                Read the longer story <ArrowUpRight size={12} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              {diffusionPost && (
                <Link to={`/blog/${diffusionPost.slug}`} className="group inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                  How diffusion works, from scratch <ArrowUpRight size={12} />
                </Link>
              )}
            </div>

            <div className="mt-20">
              <h3 className="label mb-4">Model details</h3>
              <dl className="border-t border-line/20">
                {rows.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-4 border-b border-line/10 py-3.5 text-[0.95rem] sm:grid-cols-[11rem_1fr]">
                    <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground pt-1">{k}</dt>
                    <dd className="text-foreground/90">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="md:col-span-3 md:col-start-10 lg:col-span-3 lg:col-start-10">
            <div className="md:sticky md:top-28">
              <ForwardProcessWidget src={PERSONAL_INFO.profilePicture} alt={`Portrait of ${PERSONAL_INFO.name}`} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
