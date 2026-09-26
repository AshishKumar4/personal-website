import React, { useCallback, useRef } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { StoryChapter } from '@shared/types';
import { cn } from '@/lib/utils';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Container } from '@/components/site/SectionHeader';
import { useStageRegion } from '@/components/site/stage';
import { SCENE_TONE, layoutFor, resolveStory, roman, splitCount, type ChapterLayout } from '@/components/site/story';

function ease(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function countUp(root: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-count]'));
  if (nodes.length === 0) return;
  const start = performance.now();
  const targets = nodes.map(n => ({ n, to: Number(n.dataset.count), d: Number(n.dataset.decimals || 0), delay: Number(n.dataset.delay || 0) }));
  const tick = (now: number) => {
    let done = true;
    for (const t of targets) {
      const k = Math.max(0, Math.min(1, (now - start - t.delay) / 1500));
      if (k < 1) done = false;
      t.n.textContent = (t.to * ease(k)).toFixed(t.d);
    }
    if (!done) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function Title({ text, className, wdth }: { text: string; className?: string; wdth: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <h2 className={cn('t-chapter legible text-foreground', className)} style={{ '--wdth': wdth, '--ts': text.length < 20 ? 1.28 : 1 } as React.CSSProperties}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <React.Fragment key={i}>
            <span className="w" style={{ '--i': i } as React.CSSProperties}>
              <span className="w-ghost">{word}</span>
              <span className="w-live">{word}</span>
            </span>
            {i < words.length - 1 && ' '}
          </React.Fragment>
        ))}
      </span>
    </h2>
  );
}

function Readouts({ chapter, className, cols }: { chapter: StoryChapter; className?: string; cols?: boolean }) {
  return (
    <dl data-anchor className={cn('grid gap-x-8', cols ? 'grid-cols-1 gap-y-5 sm:grid-cols-3' : 'grid-cols-1 gap-y-5', className)}>
      {chapter.highlights.map((h, i) => {
        const c = splitCount(h.value);
        return (
          <div key={`${h.label}-${i}`} data-reveal className="readout border-t border-foreground/15 pt-3" style={{ '--k': 2 + i } as React.CSSProperties}>
            <dt className="t-kicker text-foreground/50">{h.label}</dt>
            <dd className="readout-v t-readout legible mt-1.5 text-[clamp(1.0625rem,1.35vw,1.3125rem)] leading-snug text-foreground">
              {c ? (
                <>
                  {c.before}
                  <span data-count={c.n} data-decimals={c.decimals} data-delay={i * 140}>{c.n.toFixed(c.decimals)}</span>
                  {c.after}
                </>
              ) : (
                h.value
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function Links({ chapter, className }: { chapter: StoryChapter; className?: string }) {
  if (!chapter.links?.length) return null;
  return (
    <div data-reveal className={cn('flex flex-wrap gap-2.5', className)} style={{ '--k': 5 } as React.CSSProperties}>
      {chapter.links.map(l => (
        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="pill group">
          {l.label}
          <ArrowUpRight size={13} className="opacity-60 transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-px" />
        </a>
      ))}
    </div>
  );
}

function Body({ chapter, className }: { chapter: StoryChapter; className?: string }) {
  const paragraphs = chapter.body.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  return (
    <div className={cn('t-narration legible space-y-5 text-[clamp(1.125rem,1.3vw,1.3125rem)] leading-[1.55]', className)}>
      {paragraphs.map((p, j) => (
        <p key={j} data-reveal className={cn('text-pretty', j === 0 ? 'text-foreground/[0.93]' : 'text-foreground/70')} style={{ '--k': j } as React.CSSProperties}>
          {p}
        </p>
      ))}
    </div>
  );
}

function Slate({ index, era, className }: { index: number; era: string; className?: string }) {
  return (
    <div className={cn('t-kicker legible flex items-center gap-4', className)}>
      <span className="text-[hsl(var(--tone))]">Chapter {roman(index)}</span>
      <span aria-hidden="true" className="slate-rule h-px w-12 bg-foreground/30 md:w-16" />
      <span className="text-foreground/60">{era}</span>
    </div>
  );
}

const SCRIM: Record<ChapterLayout, string> = {
  left: 'radial-gradient(ellipse 70% 80% at 22% 55%, hsl(var(--background) / 0.78), hsl(var(--background) / 0.35) 55%, transparent 80%)',
  right: 'radial-gradient(ellipse 70% 80% at 78% 55%, hsl(var(--background) / 0.78), hsl(var(--background) / 0.35) 55%, transparent 80%)',
  split: 'linear-gradient(90deg, hsl(var(--background) / 0.7), hsl(var(--background) / 0.25) 45%, hsl(var(--background) / 0.7))',
  center: 'radial-gradient(ellipse 62% 70% at 50% 52%, hsl(var(--background) / 0.8), hsl(var(--background) / 0.35) 60%, transparent 85%)',
  low: 'linear-gradient(0deg, hsl(var(--background) / 0.86), hsl(var(--background) / 0.35) 55%, hsl(var(--background) / 0.55))',
};

function Layout({ chapter, index, layout }: { chapter: StoryChapter; index: number; layout: ChapterLayout }) {
  const slate = <Slate index={index} era={chapter.era} />;
  if (layout === 'right') {
    return (
      <div className="grid grid-cols-1 gap-y-9 md:grid-cols-12 md:gap-x-8">
        <div className="md:col-span-9 md:col-start-4 md:flex md:justify-end">{slate}</div>
        <Title text={chapter.title} wdth="125%" className="text-[calc(clamp(2.35rem,min(5.8vw,10vh),6.25rem)*var(--ts,1))] md:col-span-10 md:col-start-3 md:text-right" />
        <div className="md:col-span-5 md:col-start-8 md:row-start-3">
          <Body chapter={chapter} />
          <Links chapter={chapter} className="mt-7" />
        </div>
        <div className="md:col-span-4 md:col-start-1 md:row-start-3 md:pt-2.5">
          <Readouts chapter={chapter} />
        </div>
      </div>
    );
  }
  if (layout === 'split') {
    return (
      <div className="grid grid-cols-1 gap-y-9 md:grid-cols-12 md:items-center md:gap-x-8">
        <div className="space-y-9 md:col-span-6">
          {slate}
          <Title text={chapter.title} wdth="122%" className="text-[calc(clamp(2.35rem,min(5.2vw,10vh),5.75rem)*var(--ts,1))]" />
        </div>
        <div className="space-y-9 md:col-span-5 md:col-start-8">
          <Body chapter={chapter} />
          <Readouts chapter={chapter} />
          <Links chapter={chapter} />
        </div>
      </div>
    );
  }
  if (layout === 'center') {
    return (
      <div className="flex flex-col gap-y-9 md:items-center md:text-center">
        {slate}
        <Title text={chapter.title} wdth="125%" className="max-w-[15ch] text-[calc(clamp(2.5rem,min(6.6vw,12vh),7rem)*var(--ts,1))]" />
        <Body chapter={chapter} className="max-w-[36rem] [&>p]:text-balance" />
        <Readouts chapter={chapter} cols className="w-full max-w-[52rem] md:text-left" />
        <Links chapter={chapter} className="md:justify-center" />
      </div>
    );
  }
  if (layout === 'low') {
    return (
      <div className="grid grid-cols-1 gap-y-9 md:grid-cols-12 md:grid-rows-[auto_1fr_auto_auto] md:gap-x-8 md:gap-y-10">
        <div className="md:col-span-5 md:row-start-1">{slate}</div>
        <Title text={chapter.title} wdth="125%" className="text-[calc(clamp(2.35rem,min(6vw,11vh),6.75rem)*var(--ts,1))] md:col-span-7 md:row-start-3 md:self-end md:pt-10" />
        <div className="md:col-span-5 md:col-start-8 md:row-span-3 md:row-start-1 md:pb-6">
          <Body chapter={chapter} />
          <Links chapter={chapter} className="mt-7" />
        </div>
        <Readouts chapter={chapter} cols className="md:col-span-12 md:row-start-4 md:max-w-[62rem]" />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-y-9 md:grid-cols-12 md:gap-x-8">
      <div className="md:col-span-8">{slate}</div>
      <Title text={chapter.title} wdth="125%" className="text-[calc(clamp(2.35rem,min(6.2vw,11vh),6.75rem)*var(--ts,1))] md:col-span-10" />
      <div className="md:col-span-5">
        <Body chapter={chapter} />
        <Links chapter={chapter} className="mt-7" />
      </div>
      <div className="md:col-span-4 md:col-start-9 md:self-end">
        <Readouts chapter={chapter} />
      </div>
    </div>
  );
}

function Chapter({ chapter, index }: { chapter: StoryChapter; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const layout = layoutFor(index);
  const onLive = useCallback(() => {
    if (ref.current) countUp(ref.current);
  }, []);
  useStageRegion(ref, { kind: 'chapter', label: chapter.title, pin: true, onLive });

  return (
    <section
      ref={ref}
      id={chapter.id}
      data-scene={chapter.scene}
      aria-label={`Chapter ${roman(index)}: ${chapter.title}`}
      className="chapter relative"
      style={{ '--tone': SCENE_TONE[chapter.scene] } as React.CSSProperties}
    >
      <div className="chapter-stage relative flex items-center py-24 md:py-36">
        <div aria-hidden="true" className="chapter-scrim pointer-events-none absolute inset-0" style={{ background: SCRIM[layout] }} />
        <div className="chapter-inner relative w-full md:pb-16 md:pt-20">
          <Container>
            <Layout chapter={chapter} index={index} layout={layout} />
          </Container>
        </div>
      </div>
    </section>
  );
}

export function StorySection() {
  const { config } = useSiteConfig();
  const story = resolveStory(config);
  return (
    <div id="story" className="relative">
      {story.map((chapter, i) => (
        <Chapter key={chapter.id || i} chapter={chapter} index={i} />
      ))}
    </div>
  );
}
