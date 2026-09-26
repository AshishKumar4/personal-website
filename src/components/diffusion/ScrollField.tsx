import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { FieldRenderer, MAX_BRUSH } from '@/lib/diffusion/field-renderer';
import { composeBanner, fontsReady, readPalette } from '@/lib/diffusion/compose';
import { clamp01, quantize } from '@/lib/diffusion/schedule';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface ScrollFieldProps {
  text: string;
  className?: string;
  seed?: number;
  sampleOnMount?: boolean;
}

const RESAMPLE_MS = 2200;

export function ScrollField({ text, className, seed = 1337, sampleOnMount = false }: ScrollFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<{ setText: (t: string) => void } | null>(null);
  const reduced = useReducedMotion();
  const initialText = useRef(text);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = FieldRenderer.create(canvas);
    const ctx2d = renderer ? null : canvas.getContext('2d');
    const x0 = document.createElement('canvas');
    const x0ctx = x0.getContext('2d')!;
    let current = initialText.current;
    let disposed = false;
    let raf = 0;
    let visible = false;
    let ready = false;
    let dpr = 1;
    let frame = 0;
    let resampleAt = 0;
    let lastNow = performance.now();
    let lastPointer: { x: number; y: number; at: number } | null = null;
    const strokes: { x: number; y: number; s: number; r: number }[] = [];
    const brush = new Float32Array(MAX_BRUSH * 4);

    const compose = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, w >= 1600 ? 1.25 : 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      x0.width = canvas.width;
      x0.height = canvas.height;
      composeBanner(x0ctx, w, h, dpr, readPalette(), current);
      renderer?.upload(x0);
      schedule();
    };

    const scrollT = () => {
      if (reduced) return 0;
      const rect = canvas.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = (vh - rect.top) / (vh * 0.62 + rect.height * 0.3);
      return 1 - clamp01(p);
    };

    const loop = (now: number) => {
      raf = 0;
      if (disposed || !ready) return;
      const dt = Math.min(64, now - lastNow);
      lastNow = now;
      frame++;
      let t = scrollT();
      let eta = 0.3 * t;
      let resampling = false;
      if (resampleAt) {
        const tau = clamp01((now - resampleAt) / RESAMPLE_MS);
        t = Math.max(t, quantize(1 - tau, 48).t);
        eta = 0.35 * (1 - tau);
        resampling = tau < 1;
        if (!resampling) resampleAt = 0;
      }
      const q = quantize(t, 60);
      for (let i = strokes.length - 1; i >= 0; i--) {
        strokes[i].s *= Math.exp(-dt / 480);
        if (strokes[i].s < 0.01) strokes.splice(i, 1);
      }
      let active = 0;
      for (let i = 0; i < strokes.length && i < MAX_BRUSH; i++) {
        brush.set([strokes[i].x, strokes[i].y, strokes[i].s, strokes[i].r], i * 4);
        active++;
      }
      if (renderer) {
        renderer.render({ t: q.t, seed, step: q.step, eta, cell: Math.max(1, Math.round(2 * dpr)), frame, grain: 0, brush, brushCount: active });
      } else if (ctx2d) {
        ctx2d.drawImage(x0, 0, 0);
      }
      if (resampling || active > 0) schedule();
    };

    const schedule = () => {
      if (!raf && visible && !disposed) raf = requestAnimationFrame(loop);
    };

    const onScroll = () => schedule();

    const onPointer = (e: PointerEvent) => {
      if (reduced || !renderer || !visible) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        lastPointer = null;
        return;
      }
      const now = performance.now();
      if (lastPointer) {
        const dist = Math.hypot(x - lastPointer.x, y - lastPointer.y);
        if (dist < 10) return;
        const speed = dist / Math.max(1, now - lastPointer.at);
        strokes.push({ x: x * dpr, y: (rect.height - y) * dpr, s: Math.min(0.9, 0.22 + speed * 0.35), r: Math.min(160, 55 + speed * 40) * dpr });
        if (strokes.length > MAX_BRUSH) strokes.shift();
        schedule();
      }
      lastPointer = { x, y, at: now };
    };

    apiRef.current = {
      setText: (next: string) => {
        if (next === current) return;
        current = next;
        if (!ready) return;
        compose();
        if (!reduced) resampleAt = performance.now();
        schedule();
      },
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => {
      if (ready) compose();
    });
    ro.observe(canvas);
    const mo = new MutationObserver(() => {
      if (ready) compose();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-accent'] });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });

    fontsReady().then(() => {
      if (disposed) return;
      ready = true;
      if (sampleOnMount && !reduced) resampleAt = performance.now();
      compose();
    });

    return () => {
      disposed = true;
      apiRef.current = null;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      renderer?.dispose();
    };
  }, [reduced, seed, sampleOnMount]);

  useEffect(() => {
    apiRef.current?.setText(text);
  }, [text]);

  return <canvas ref={canvasRef} aria-hidden="true" className={cn('block h-full w-full', className)} />;
}
