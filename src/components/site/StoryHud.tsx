import React, { useEffect, useRef } from 'react';
import type { StoryChapter } from '@shared/types';
import { cn } from '@/lib/utils';
import { emitFlight, onFlight } from '@/lib/flight/bus';
import { onStage, scrollToChapter } from '@/components/site/stage';
import { SCENE_TONE, roman } from '@/components/site/story';
import { useFlightFlag } from '@/components/site/flight-flags';

function pad(n: number, width: number) {
  const s = String(Math.max(0, Math.round(n)));
  return s.length >= width ? s : '0'.repeat(width - s.length) + s;
}

export function StoryHud({ chapters }: { chapters: StoryChapter[] }) {
  const root = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLSpanElement>(null);
  const alt = useRef<HTMLSpanElement>(null);
  const spd = useRef<HTMLSpanElement>(null);
  const hdg = useRef<HTMLSpanElement>(null);
  const tele = useRef<HTMLDivElement>(null);
  const sound = useFlightFlag('sound');
  const free = useFlightFlag('free');

  useEffect(() => {
    let lastLabel = '';
    let lastChapter = -2;
    let lastVisible = '';
    return onStage(s => {
      const el = root.current;
      if (!el) return;
      const visible = s.kind === 'chapter' || (s.kind === 'hero' && s.heroP > 0.5) ? '1' : '0';
      if (visible !== lastVisible) {
        el.dataset.visible = visible;
        lastVisible = visible;
      }
      const marks = el.querySelectorAll<HTMLElement>('[data-mark]');
      marks.forEach((m, i) => {
        const f = i < s.chapter ? 1 : i === s.chapter ? s.chapterP : 0;
        m.style.setProperty('--f', f.toFixed(3));
        const on = i === s.chapter && s.kind === 'chapter';
        if ((m.dataset.on === '1') !== on) m.dataset.on = on ? '1' : '0';
      });
      const label = s.kind === 'chapter' ? `${roman(s.chapter)}. ${s.label}` : s.label;
      if (label !== lastLabel && title.current) {
        title.current.textContent = label;
        lastLabel = label;
      }
      if (s.chapter !== lastChapter) {
        const scene = chapters[s.chapter]?.scene;
        el.style.setProperty('--tone', scene ? SCENE_TONE[scene] : SCENE_TONE.night);
        lastChapter = s.chapter;
      }
      if (line.current) {
        const max = Math.max(1, document.documentElement.scrollHeight - s.vh);
        line.current.style.transform = `scaleX(${Math.min(1, s.y / max).toFixed(4)})`;
      }
    });
  }, [chapters]);

  useEffect(() => {
    let seen = false;
    return onFlight('telemetry', t => {
      if (!seen && tele.current) {
        tele.current.dataset.on = '1';
        seen = true;
      }
      if (alt.current) alt.current.textContent = pad(t.altitude, 4);
      if (spd.current) spd.current.textContent = pad(t.speed, 4);
      if (hdg.current) hdg.current.textContent = pad(((t.heading % 360) + 360) % 360, 3);
    });
  }, []);

  const btn = 't-kicker pointer-events-auto inline-flex h-7 items-center gap-2 rounded-full border px-3 transition-colors duration-300';

  return (
    <>
      <div aria-hidden="true" className="fade-free pointer-events-none fixed inset-x-0 top-0 z-[55] h-px bg-foreground/[0.06] lg:hidden">
        <div ref={line} className="h-full origin-left bg-foreground/60" style={{ transform: 'scaleX(0)' }} />
      </div>
      <div
        ref={root}
        data-visible="0"
        className="fade-free pointer-events-none fixed inset-x-0 bottom-0 z-40 hidden transition-[opacity,transform] duration-700 ease-out-expo data-[visible=0]:translate-y-2 data-[visible=0]:opacity-0 lg:block"
      >
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/70 to-transparent" />
        <nav aria-label="Story progress" className="relative mx-auto flex max-w-[1480px] items-end justify-between gap-8 px-12 pb-6">
          <div className="flex min-w-0 items-end gap-6">
            <ol className="flex items-end gap-1.5">
              {chapters.map((c, i) => (
                <li key={c.id || i}>
                  <button
                    type="button"
                    data-mark
                    data-on="0"
                    onClick={() => scrollToChapter(i)}
                    aria-label={`Chapter ${roman(i)}: ${c.title}`}
                    className="group pointer-events-auto flex w-11 flex-col gap-2 pt-2 text-left data-[on=1]:text-foreground"
                  >
                    <span className="font-mono text-[0.625rem] tracking-[0.12em] text-foreground/40 transition-colors group-hover:text-foreground group-data-[on=1]:text-foreground">{roman(i)}</span>
                    <span className="relative block h-px w-full bg-foreground/20">
                      <span className="hud-fill absolute inset-0 bg-foreground/70 group-data-[on=1]:bg-[hsl(var(--tone))]" />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <span ref={title} className="legible max-w-[34ch] truncate pb-[1px] text-[0.8125rem] font-[450] leading-none tracking-[-0.005em] text-foreground/85" style={{ fontStretch: '108%' }} />
          </div>
          <div className="flex shrink-0 items-end gap-6">
            <div ref={tele} className="legible flex gap-5 font-mono text-[0.6875rem] leading-none tracking-[0.06em] text-foreground/45 opacity-0 transition-opacity duration-700 data-[on=1]:opacity-100 tabular">
              <span>ALT <span ref={alt} className="text-foreground/85">0000</span></span>
              <span>SPD <span ref={spd} className="text-foreground/85">0000</span></span>
              <span>HDG <span ref={hdg} className="text-foreground/85">000</span></span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-pressed={sound}
                onClick={() => emitFlight('sound', !sound)}
                className={cn(btn, sound ? 'border-foreground/50 text-foreground' : 'border-foreground/15 text-foreground/55 hover:border-foreground/40 hover:text-foreground')}
              >
                <SoundGlyph on={sound} />
                Sound
              </button>
              <button
                type="button"
                aria-pressed={free}
                onClick={() => emitFlight('free', !free)}
                className={cn(btn, 'border-foreground/15 text-foreground/55 hover:border-foreground/40 hover:text-foreground')}
              >
                Fly
              </button>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}

function SoundGlyph({ on }: { on: boolean }) {
  const bars = [0.45, 1, 0.7, 0.35];
  return (
    <span aria-hidden="true" className="flex h-2.5 items-end gap-[2px]">
      {bars.map((h, i) => (
        <span
          key={i}
          className={cn('w-px bg-current', on && 'animate-pulse-dot')}
          style={{ height: on ? `${h * 100}%` : '20%', animationDelay: `${i * 0.18}s` } as React.CSSProperties}
        />
      ))}
    </span>
  );
}
