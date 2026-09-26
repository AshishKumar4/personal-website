import React, { useEffect, useMemo, useRef } from 'react';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { onStage, scrollToYear } from '@/components/site/stage';
import { SCENE_TONE, buildTimeline } from '@/components/site/timeline';
import type { SceneId } from '@shared/types';

export function YearRail() {
  const { data } = useSiteConfig();
  const root = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const mobile = useRef<HTMLDivElement>(null);
  const mobileFill = useRef<HTMLDivElement>(null);
  const mobileYear = useRef<HTMLSpanElement>(null);

  const [min, max] = useMemo(() => {
    const starts = data ? buildTimeline(data.experiences, data.projects).map(e => e.start).filter((s): s is number => s !== null) : [];
    const now = new Date().getFullYear();
    if (starts.length === 0) return [now - 10, now];
    return [Math.floor(Math.min(...starts)), Math.max(now, Math.floor(Math.max(...starts)))];
  }, [data]);
  const years = useMemo(() => Array.from({ length: max - min + 1 }, (_, i) => min + i), [min, max]);

  useEffect(() => {
    let lastLabel = '';
    let lastYear = -1;
    let lastVisible = '';
    let lastScene = '';
    return onStage(s => {
      const el = root.current;
      if (!el) return;
      const visible = s.inTimeline ? '1' : '0';
      if (visible !== lastVisible) {
        el.dataset.visible = visible;
        if (mobile.current) mobile.current.dataset.visible = visible;
        lastVisible = visible;
      }
      if (s.year === null) return;
      const t = Math.max(0, Math.min(1, (s.year - min) / Math.max(1, max - min + 0.999)));
      el.style.setProperty('--t', t.toFixed(4));
      if (mobileFill.current) mobileFill.current.style.transform = `scaleX(${s.progress.toFixed(4)})`;
      if (label.current && s.label !== lastLabel) {
        label.current.textContent = s.label;
        lastLabel = s.label;
      }
      if (s.scene !== lastScene) {
        el.style.setProperty('--tone', SCENE_TONE[(s.scene as SceneId) ?? 'night'] ?? SCENE_TONE.night);
        mobile.current?.style.setProperty('--tone', SCENE_TONE[(s.scene as SceneId) ?? 'night'] ?? SCENE_TONE.night);
        lastScene = s.scene;
      }
      const y = Math.floor(s.nodeYear ?? s.year);
      if (y !== lastYear) {
        el.querySelectorAll<HTMLElement>('[data-year]').forEach(n => {
          n.dataset.on = Number(n.dataset.year) === y ? '1' : Number(n.dataset.year) < y ? 'past' : '0';
        });
        if (mobileYear.current) mobileYear.current.textContent = String(y);
        lastYear = y;
      }
    });
  }, [min, max]);

  if (!data) return null;

  return (
    <>
      <div
        ref={mobile}
        data-visible="0"
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[55] transition-opacity duration-700 data-[visible=0]:opacity-0 lg:hidden"
      >
        <div className="h-px w-full bg-foreground/10">
          <div ref={mobileFill} className="h-full origin-left bg-[hsl(var(--tone))]" style={{ transform: 'scaleX(0)' }} />
        </div>
        <span ref={mobileYear} className="legible absolute right-5 top-[4.1rem] font-mono text-[0.6875rem] tracking-[0.08em] text-foreground/70 sm:right-8" />
      </div>
      <nav
        ref={root}
        data-visible="0"
        aria-label="Timeline"
        className="pointer-events-none fixed right-6 top-1/2 z-40 hidden h-[58vh] w-40 -translate-y-1/2 transition-opacity duration-700 data-[visible=0]:opacity-0 lg:block xl:right-8"
      >
        <div aria-hidden="true" className="absolute bottom-0 right-[2.9rem] top-0 w-px bg-foreground/15" />
        <div aria-hidden="true" className="absolute right-[2.9rem] top-0 w-px bg-[hsl(var(--tone))] opacity-60" style={{ height: 'calc(var(--t, 0) * 100%)', transition: 'height 0.25s linear' }} />
        <ol className="absolute inset-0">
          {years.map((year, i) => (
            <li key={year} className="absolute right-0" style={{ top: `${(i / Math.max(1, years.length - 1)) * 100}%` }}>
              <button
                type="button"
                data-year={year}
                data-on="0"
                onClick={() => scrollToYear(year)}
                aria-label={String(year)}
                className="group pointer-events-auto -mt-2 flex h-4 items-center gap-2 font-mono text-[0.625rem] tabular tracking-[0.04em] text-foreground/30 transition-colors duration-500 hover:text-foreground data-[on=1]:text-foreground data-[on=past]:text-foreground/50"
              >
                <span aria-hidden="true" className="h-px w-1.5 bg-current" />
                <span className="w-8 text-left">{year}</span>
              </button>
            </li>
          ))}
        </ol>
        <div
          aria-hidden="true"
          className="absolute right-[2.9rem] flex items-center"
          style={{ top: 'calc(var(--t, 0) * 100%)', transition: 'top 0.25s linear' } as React.CSSProperties}
        >
          <span ref={label} className="legible mr-3 max-w-[8.5rem] -translate-y-px truncate text-right text-[0.75rem] font-[460] leading-none text-foreground" style={{ fontStretch: '106%' }} />
          <span className="h-px w-4 translate-x-[0.5rem] bg-[hsl(var(--tone))]" />
          <span className="absolute right-0 h-1.5 w-1.5 translate-x-1/2 rounded-full bg-[hsl(var(--tone))]" />
        </div>
      </nav>
    </>
  );
}
