import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { emitFlight } from '@/lib/flight/bus';
import { useFlightFlag } from '@/components/site/flight-flags';

const HINT_KEY = 'flight-hint-v1';

function coarse() {
  return window.matchMedia('(pointer: coarse)').matches;
}

export function FreeFlightOverlay() {
  const free = useFlightFlag('free');
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    setTouch(coarse());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!free) {
      delete root.dataset.free;
      return;
    }
    root.dataset.free = '1';
    root.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') emitFlight('free', false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      root.style.overflow = '';
      delete root.dataset.free;
      window.removeEventListener('keydown', onKey);
    };
  }, [free]);

  useEffect(() => () => emitFlight('free', false), []);

  return (
    <div
      role="dialog"
      aria-label="Free flight"
      aria-hidden={!free}
      className={cn(
        'pointer-events-none fixed inset-0 z-[60] flex flex-col justify-between px-5 pb-8 pt-6 transition-opacity duration-700 sm:px-8 lg:px-12',
        free ? 'opacity-100' : 'invisible opacity-0',
      )}
    >
      <div className="t-kicker legible flex items-center justify-between text-foreground/70">
        <span className="flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-signal animate-pulse-dot" />
          Free flight
        </span>
        <button
          type="button"
          tabIndex={free ? 0 : -1}
          onClick={() => emitFlight('free', false)}
          className="pointer-events-auto inline-flex h-9 items-center gap-2.5 rounded-full border border-foreground/25 bg-background/40 px-4 text-foreground backdrop-blur-sm transition-colors hover:border-foreground/60"
        >
          Land
          <span className="text-foreground/50">Esc</span>
        </button>
      </div>
      <div className="legible mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[0.8125rem] text-foreground/70">
        {touch ? (
          <>
            <span>Drag to steer</span>
            <span>Press and hold to boost</span>
            <span>Tap for a shockwave</span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-2">
              <span className="flex gap-1"><span className="kbd">W</span><span className="kbd">A</span><span className="kbd">S</span><span className="kbd">D</span></span>
              steer
            </span>
            <span className="flex items-center gap-2"><span className="kbd px-3">Space</span> boost</span>
            <span className="flex items-center gap-2"><span className="kbd">Click</span> shockwave</span>
            <span className="flex items-center gap-2"><span className="kbd">Esc</span> land</span>
          </>
        )}
      </div>
    </div>
  );
}

export function FlightHint() {
  const [show, setShow] = useState(false);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      if (localStorage.getItem(HINT_KEY)) return;
    } catch {
      return;
    }
    setTouch(coarse());
    let hide = 0;
    const dismiss = () => {
      setShow(false);
      try {
        localStorage.setItem(HINT_KEY, '1');
      } catch {
        return;
      }
    };
    const onScroll = () => {
      if (window.scrollY > window.innerHeight * 0.6) dismiss();
    };
    const open = window.setTimeout(() => {
      setShow(true);
      hide = window.setTimeout(dismiss, 9000);
    }, 2600);
    const onDown = () => window.setTimeout(dismiss, 1400);
    window.addEventListener('pointerdown', onDown, { once: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(open);
      window.clearTimeout(hide);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className={cn(
        'fade-free pointer-events-none fixed inset-x-0 top-20 z-30 flex justify-center px-5 transition-[opacity,transform] duration-1000 ease-out-expo md:top-24',
        show ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
      )}
    >
      <p aria-hidden={!show} className="legible flex items-center gap-3 rounded-full border border-foreground/10 bg-background/35 px-4 py-2 text-[0.8125rem] text-foreground/75 backdrop-blur-md">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal animate-pulse-dot" />
          {touch ? 'Tap anywhere for a shockwave. Press and hold to boost.' : 'Click anywhere for a shockwave. Hold to boost.'}
      </p>
    </div>
  );
}
