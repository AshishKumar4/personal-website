import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { DEFAULT_SITE_EXTRAS, type SceneId } from '@shared/types';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Container } from '@/components/site/SectionHeader';
import { Words } from '@/components/site/Words';
import { useStageRegion } from '@/components/site/stage';
import { SCENE_TONE } from '@/components/site/timeline';
import { parseOrigins, type OriginChapter } from '@/components/site/origins';
import { LabArt, MachineArt, MindArt, QuantumArt } from '@/components/site/OriginArt';
import { PERSONAL_INFO } from '@/components/config/constants';
import { cn } from '@/lib/utils';
import './origins.css';

const WORLDS: { scene: SceneId; motif: string; seed: number; Art: () => React.ReactElement }[] = [
  { scene: 'signal', motif: 'crystal', seed: 0.2113, Art: LabArt },
  { scene: 'noise', motif: 'quantum', seed: 0.4721, Art: QuantumArt },
  { scene: 'kernel', motif: 'arena', seed: 0.6307, Art: MachineArt },
  { scene: 'night', motif: 'mind', seed: 0.8219, Art: MindArt },
];

function Intro() {
  const head = useRef<HTMLDivElement>(null);
  const figure = useRef<HTMLDivElement>(null);
  const { config } = useSiteConfig();
  useStageRegion(head, { kind: 'reveal', anchor: 'top', span: 0.5 });
  useStageRegion(figure, { kind: 'reveal', anchor: 'top', span: 0.8 });
  const portrait = config?.portraitUrl || DEFAULT_SITE_EXTRAS.portraitUrl;
  const about = config?.about?.trim();

  return (
    <div data-scene="night" className="relative pb-[8svh] pt-[22svh] md:pb-[12svh] md:pt-[30svh]">
      <Container>
        <div className="grid grid-cols-1 items-end gap-y-14 md:grid-cols-12 md:gap-x-10">
          <div ref={head} className="reveal-title scrim md:col-span-7 lg:col-span-7">
            <div className="t-kicker legible flex items-center gap-4 text-foreground/70">
              <span>About me</span>
              <span aria-hidden="true" className="reveal-rule h-px w-14 bg-foreground/35" />
            </div>
            <Words as="h2" id="about-title" text="Where it started" className="t-scene mt-6 text-[clamp(2.8rem,7vw,7rem)] leading-[0.94] text-foreground" />
            {about && (
              <p className="reveal-sub t-narration legible mt-8 max-w-[36rem] text-[clamp(1.125rem,1.35vw,1.3rem)] leading-[1.62] text-foreground/92 text-pretty">{about}</p>
            )}
          </div>
          <div ref={figure} className="og-portrait md:col-span-4 md:col-start-9">
            <figure className="og-portrait-frame">
              <img
                src={portrait}
                alt={`Portrait of ${PERSONAL_INFO.name}`}
                decoding="async"
                loading="lazy"
                onError={e => {
                  if (!e.currentTarget.src.endsWith(PERSONAL_INFO.portraitFallback)) e.currentTarget.src = PERSONAL_INFO.portraitFallback;
                }}
              />
              <span className="og-portrait-tint" />
            </figure>
          </div>
        </div>
      </Container>
    </div>
  );
}

function Chapter({ chapter, index, last }: { chapter: OriginChapter; index: number; last: boolean }) {
  const text = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLDivElement>(null);
  useStageRegion(text, { kind: 'reveal', anchor: 'top', span: 0.45 });
  useStageRegion(art, { kind: 'reveal', anchor: 'top', span: 0.95 });
  const world = WORLDS[index];
  const scene = world?.scene ?? 'night';
  const flip = index % 2 === 1;
  const Art = world?.Art;

  return (
    <article
      data-scene={scene}
      data-motif={world?.motif}
      data-seed={world ? world.seed.toFixed(4) : undefined}
      aria-label={chapter.title}
      className="relative flex min-h-[100svh] items-center py-[16svh]"
      style={{ '--tone': SCENE_TONE[scene] } as React.CSSProperties}
    >
      <Container>
        <div className="grid grid-cols-1 items-center gap-y-12 md:grid-cols-12 md:gap-x-10">
          <div ref={text} className={cn('reveal-title scrim md:col-span-5', flip ? 'md:col-start-8 md:row-start-1' : 'md:col-start-1')}>
            <div className="t-kicker legible flex items-center gap-3 text-foreground/70">
              <span className="text-[hsl(var(--tone))] tabular">{String(index + 1).padStart(2, '0')}</span>
              <span aria-hidden="true" className="reveal-rule h-px w-10 bg-foreground/35" />
              {chapter.label && <span>{chapter.label}</span>}
            </div>
            <Words as="h3" text={chapter.title} className="t-scene mt-5 text-[clamp(2.4rem,4.8vw,4.6rem)] leading-[0.98] text-foreground text-balance" />
            <div className="reveal-sub">
              {chapter.body.map((p, i) => (
                <p key={i} className="t-narration legible mt-6 max-w-[34rem] text-[clamp(1.0625rem,1.25vw,1.25rem)] leading-[1.66] text-foreground/92 text-pretty">{p}</p>
              ))}
              {last && (
                <Link to="/about" className="pill group mt-8">
                  The longer story
                  <ArrowUpRight size={13} className="opacity-60 transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px" />
                </Link>
              )}
            </div>
          </div>
          {Art && (
            <div ref={art} aria-hidden="true" className={cn('og-art md:col-span-6', flip ? 'md:col-start-1 md:row-start-1' : 'md:col-start-7')}>
              <Art />
            </div>
          )}
        </div>
      </Container>
    </article>
  );
}

export function OriginsSection() {
  const { config } = useSiteConfig();
  const chapters = parseOrigins(config?.origins);

  return (
    <section id="about" aria-labelledby="about-title" className="relative overflow-x-clip">
      <Intro />
      {chapters.map((c, i) => (
        <Chapter key={`${i}-${c.title}`} chapter={c} index={i} last={i === chapters.length - 1} />
      ))}
    </section>
  );
}
