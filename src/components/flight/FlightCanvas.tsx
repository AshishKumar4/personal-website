import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { releaseIntro } from '@/components/flight/intro-gate';

const FALLBACK = 'radial-gradient(ellipse at 34% 62%, #1b1812 0%, #07080c 60%)';

export function FlightCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (failed) releaseIntro();
    if (!canvas || failed) return;
    let handle: { dispose(): void } | null = null;
    let cancelled = false;
    import('@/lib/flight/engine')
      .then(({ startFlight }) => {
        if (cancelled) return;
        handle = startFlight(canvas, veilRef.current, reduced, () => {
          if (!cancelled) setFailed(true);
        });
        if (!handle) setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      handle?.dispose();
    };
  }, [reduced, failed]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-[100lvh] w-full">
      {failed ? (
        <div className="h-full w-full" style={{ background: FALLBACK }} />
      ) : (
        <canvas ref={canvasRef} className="h-full w-full bg-[#07080c]" />
      )}
      <div ref={veilRef} className="absolute inset-0 bg-[#07080c]" style={{ opacity: 0 }} />
    </div>
  );
}
