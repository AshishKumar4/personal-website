import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { alphaBar, snr, TIMESTEPS } from '@/lib/diffusion/schedule';
import { gaussianBuffer, renderNoisy } from '@/lib/diffusion/noise';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { PERSONAL_INFO } from '@/components/config/constants';

interface ForwardProcessWidgetProps {
  src: string;
  alt: string;
  seed?: number;
}

const LW = 240;
const LH = 300;
const ZOOM = 1.12;

function fit(iw: number, ih: number, w: number, h: number) {
  const scale = Math.max(w / iw, h / ih) * ZOOM;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = Math.min(0, Math.max(w - dw, w * 0.5 - 0.455 * dw));
  const dy = Math.min(0, Math.max(h - dh, h * 0.36 - 0.33 * dh));
  return { dx, dy, dw, dh };
}

export function ForwardProcessWidget({ src, alt, seed = 42 }: ForwardProcessWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{ x0: Uint8ClampedArray | null; eps: Float32Array | null; frame: ImageData | null }>({
    x0: null,
    eps: null,
    frame: null,
  });
  const animRef = useRef(0);
  const crispRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const drawCrisp = useCallback(() => {
    const canvas = crispRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const c = canvas.getContext('2d');
    if (!c) return;
    const f = fit(img.naturalWidth, img.naturalHeight, canvas.width, canvas.height);
    c.drawImage(img, f.dx, f.dy, f.dw, f.dh);
  }, []);

  useEffect(() => {
    const canvas = crispRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => drawCrisp());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [drawCrisp]);
  const [t, setT] = useState(0);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();

  const paint = useCallback((tn: number) => {
    const canvas = canvasRef.current;
    const st = stateRef.current;
    if (!canvas || !st.x0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!st.frame) st.frame = ctx.createImageData(LW, LH);
    if (!st.eps) st.eps = gaussianBuffer(LW * LH * 3, seed);
    const a = alphaBar(tn);
    renderNoisy(st.frame, st.x0, st.eps, Math.sqrt(a), Math.sqrt(1 - a));
    ctx.putImageData(st.frame, 0, 0);
  }, [seed]);

  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (!alive) return;
      const off = document.createElement('canvas');
      off.width = LW;
      off.height = LH;
      const c = off.getContext('2d', { willReadFrequently: true });
      if (!c) return;
      const f = fit(img.naturalWidth, img.naturalHeight, LW, LH);
      c.drawImage(img, f.dx, f.dy, f.dw, f.dh);
      imgRef.current = img;
      drawCrisp();
      try {
        stateRef.current.x0 = c.getImageData(0, 0, LW, LH).data;
        setReady(true);
      } catch {
        stateRef.current.x0 = null;
      }
    };
    img.onerror = () => {
      if (alive && !img.src.endsWith(PERSONAL_INFO.portraitFallback)) img.src = PERSONAL_INFO.portraitFallback;
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src, drawCrisp]);

  useEffect(() => {
    if (ready) paint(t);
  }, [ready, t, paint]);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const play = () => {
    if (playing) {
      cancelAnimationFrame(animRef.current);
      setPlaying(false);
      return;
    }
    if (reduced) {
      setT(0);
      return;
    }
    setPlaying(true);
    const t0 = t;
    const upMs = (1 - t0) * 1400;
    const downMs = 2400;
    const start = performance.now();
    const tick = (now: number) => {
      const el = now - start;
      let next: number;
      if (el < upMs) next = t0 + (1 - t0) * (el / upMs);
      else next = Math.round((1 - Math.min(1, (el - upMs) / downMs)) * 50) / 50;
      setT(next);
      if (el >= upMs + downMs) {
        setPlaying(false);
        return;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  };

  const ab = alphaBar(t);
  const snrDb = t <= 0 ? Infinity : 10 * Math.log10(snr(t));

  return (
    <figure className="w-full">
      <div className="relative aspect-[4/5] w-full overflow-hidden border border-line/10 bg-card">
        <canvas ref={crispRef} role="img" aria-label={alt} className="absolute inset-0 h-full w-full" />
        <canvas
          ref={canvasRef}
          width={LW}
          height={LH}
          aria-hidden="true"
          className="pixelated absolute inset-0 h-full w-full transition-opacity duration-300"
          style={{ opacity: ready && t > 0.001 ? 1 : 0 }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/55 to-transparent px-3 pb-6 pt-2.5 font-mono text-[10px] text-white/90">
          <span>x<sub>t</sub> ~ q(x<sub>t</sub> | x<sub>0</sub>)</span>
          <span className="tabular">t = {String(Math.round(t * TIMESTEPS)).padStart(4, '0')}</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <button
          onClick={play}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line/20 text-foreground transition-colors hover:border-signal hover:text-signal"
          aria-label={playing ? 'Pause' : 'Run forward then reverse process'}
        >
          {playing ? <Pause size={13} /> : <Play size={13} className="translate-x-px" />}
        </button>
        <label className="flex-1">
          <span className="sr-only">Diffusion timestep</span>
          <input
            type="range"
            min={0}
            max={TIMESTEPS}
            step={1}
            value={Math.round(t * TIMESTEPS)}
            onChange={e => {
              cancelAnimationFrame(animRef.current);
              setPlaying(false);
              setT(Number(e.target.value) / TIMESTEPS);
            }}
            className="range-signal w-full"
          />
        </label>
      </div>
      <dl className="mt-4 grid grid-cols-3 gap-px border border-line/10 bg-line/10 font-mono text-[10.5px]">
        {[
          ['√ᾱ · signal', Math.sqrt(ab).toFixed(3)],
          ['√(1−ᾱ) · noise', Math.sqrt(1 - ab).toFixed(3)],
          ['SNR', Number.isFinite(snrDb) ? `${snrDb.toFixed(1)} dB` : '∞'],
        ].map(([k, v]) => (
          <div key={k} className="bg-background px-3 py-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="tabular mt-0.5 text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      <figcaption className="mt-3 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
        fig. 2 — the forward process, live. Drag to dissolve me into Gaussian noise, press play to sample me back.
      </figcaption>
    </figure>
  );
}
