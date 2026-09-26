import { useEffect, useRef } from 'react';
import { FieldRenderer, MAX_BRUSH } from '@/lib/diffusion/field-renderer';
import { composeHero, fontsReady, heroLayout, loadImage, readPalette, type HeroLayout } from '@/lib/diffusion/compose';
import { clamp01, quantize } from '@/lib/diffusion/schedule';
import { sampler } from '@/lib/diffusion/sampler-store';
import { heroX0 } from '@/lib/diffusion/hero-x0';

interface HeroFieldProps {
  name: string[];
  portraitUrl: string | null;
  reducedMotion: boolean;
  onLayout: (layout: HeroLayout) => void;
}

const SAMPLE_MS = 2800;
const COMMAND_HOLD_MS = 900;

interface Stroke {
  x: number;
  y: number;
  s: number;
  r: number;
}

export function HeroField({ name, portraitUrl, reducedMotion, onLayout }: HeroFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onLayoutRef = useRef(onLayout);
  onLayoutRef.current = onLayout;
  const nameKey = name.join('|');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const lines = nameKey.split('|');
    const renderer = FieldRenderer.create(canvas);
    const ctx2d = renderer ? null : canvas.getContext('2d');
    const x0 = document.createElement('canvas');
    const x0ctx = x0.getContext('2d', { willReadFrequently: false })!;
    let disposed = false;
    let raf = 0;
    let visible = true;
    let ready = false;
    let dpr = 1;
    let cssW = 0;
    let cssH = 0;
    let portrait: HTMLImageElement | null = null;
    let sampleStart = 0;
    let tSample = reducedMotion ? 0 : 1;
    let cmdT = 0;
    let cmdAt = 0;
    let frame = 0;
    let lastNow = performance.now();
    let lastPointer: { x: number; y: number; at: number } | null = null;
    const strokes: Stroke[] = [];
    const brush = new Float32Array(MAX_BRUSH * 4);
    let lastPublished = { step: -1, t: -1, scroll: -1 };

    if (renderer) sampler.update({ renderer: renderer.rendererName });

    const scrollT = () => {
      if (reducedMotion) return 0;
      const p = clamp01(window.scrollY / Math.max(1, window.innerHeight));
      return Math.pow(p, 1.25) * 0.92;
    };

    const sizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      cssW = Math.max(1, Math.round(rect.width));
      cssH = Math.max(1, Math.round(rect.height));
      const cap = cssW >= 1600 ? 1.25 : 1.5;
      dpr = Math.min(window.devicePixelRatio || 1, cap);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    };

    const compose = () => {
      sizeCanvas();
      x0.width = canvas.width;
      x0.height = canvas.height;
      const layout = heroLayout(cssW, Math.min(cssH, window.innerHeight), lines);
      layout.h = cssH;
      composeHero(x0ctx, layout, dpr, readPalette(), portrait);
      heroX0.canvas = x0;
      heroX0.version++;
      renderer?.upload(x0);
      onLayoutRef.current(layout);
      schedule();
    };

    const publish = (t: number, step: number, scroll: number) => {
      if (step === lastPublished.step && Math.abs(t - lastPublished.t) < 0.004 && Math.abs(scroll - lastPublished.scroll) < 0.01) return;
      lastPublished = { step, t, scroll };
      sampler.update({ t, step, scroll });
    };

    const loop = (now: number) => {
      raf = 0;
      if (disposed) return;
      if (!ready) {
        const cell = Math.max(1, Math.round(2 * dpr));
        renderer?.render({ t: 1, seed: sampler.get().seed, step: 0, eta: 0, cell, frame, grain: 0, brush, brushCount: 0 });
        return;
      }
      const dt = Math.min(64, now - lastNow);
      lastNow = now;
      frame++;
      const steps = sampler.get().steps;
      let step = steps;
      let eta = 0;
      const phase = sampler.get().phase;
      if (phase === 'sampling') {
        const tau = clamp01((now - sampleStart) / SAMPLE_MS);
        const q = quantize(1 - tau, steps);
        tSample = q.t;
        step = q.step;
        eta = 0.4 * (1 - tau);
        if (tau >= 1) {
          tSample = 0;
          sampler.update({ phase: 'done', elapsedMs: Math.round(now - sampleStart) });
        }
      }
      if (cmdT > 0) {
        const held = now - cmdAt;
        if (held > COMMAND_HOLD_MS) cmdT = Math.max(0, cmdT - dt / 1400);
        eta = Math.max(eta, 0.15);
      }
      let active = 0;
      for (let i = strokes.length - 1; i >= 0; i--) {
        strokes[i].s *= Math.exp(-dt / 480);
        if (strokes[i].s < 0.01) strokes.splice(i, 1);
      }
      for (let i = 0; i < strokes.length && i < MAX_BRUSH; i++) {
        const s = strokes[i];
        brush[i * 4] = s.x;
        brush[i * 4 + 1] = s.y;
        brush[i * 4 + 2] = s.s;
        brush[i * 4 + 3] = s.r;
        active++;
      }
      const sT = scrollT();
      const t = Math.max(tSample, cmdT, sT);
      if (phase !== 'sampling') step = Math.round((1 - t) * steps);
      const cell = Math.max(1, Math.round(2 * dpr));
      if (renderer) {
        renderer.render({ t, seed: sampler.get().seed, step, eta, cell, frame, grain: 0, brush, brushCount: active });
      } else if (ctx2d) {
        ctx2d.drawImage(x0, 0, 0);
      }
      publish(t, step, sT);
      if (phase === 'sampling' || cmdT > 0 || active > 0) schedule();
    };

    const schedule = () => {
      if (!raf && visible && !disposed) raf = requestAnimationFrame(loop);
    };

    const startSampling = () => {
      if (reducedMotion) {
        tSample = 0;
        sampler.update({ phase: 'done', elapsedMs: 0 });
        schedule();
        return;
      }
      sampleStart = performance.now();
      tSample = 1;
      sampler.update({ phase: 'sampling' });
      schedule();
    };

    const onPointer = (e: PointerEvent) => {
      if (reducedMotion || !renderer || window.scrollY > window.innerHeight) return;
      const now = performance.now();
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (lastPointer) {
        const dx = x - lastPointer.x;
        const dy = y - lastPointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 10) return;
        const speed = dist / Math.max(1, now - lastPointer.at);
        const s = Math.min(0.9, 0.22 + speed * 0.35);
        const r = Math.min(170, 60 + speed * 40) * dpr;
        strokes.push({ x: x * dpr, y: (rect.height - y) * dpr, s, r });
        if (strokes.length > MAX_BRUSH) strokes.shift();
        schedule();
      }
      lastPointer = { x, y, at: now };
    };

    const onScroll = () => schedule();

    const unsubCmd = sampler.onCommand(cmd => {
      if (cmd.type === 'resample') {
        sampler.newSeed();
        startSampling();
      } else if (cmd.type === 'noise') {
        cmdT = clamp01(cmd.t);
        cmdAt = performance.now();
        schedule();
      }
    });

    const ro = new ResizeObserver(() => {
      if (ready) compose();
      else {
        sizeCanvas();
        schedule();
      }
    });
    ro.observe(canvas);

    const mo = new MutationObserver(() => {
      if (ready) compose();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-accent'] });

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
    });
    const section = canvas.closest('section') ?? canvas;
    io.observe(section);

    const onVisibility = () => {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else {
        lastNow = performance.now();
        schedule();
      }
    };

    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    (async () => {
      if (portraitUrl === null) return;
      const [img] = await Promise.all([loadImage(portraitUrl), fontsReady()]);
      if (disposed) return;
      portrait = img;
      ready = true;
      compose();
      if (sampler.get().phase === 'done') {
        tSample = 0;
        schedule();
      } else {
        startSampling();
      }
    })();

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
      unsubCmd();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer?.dispose();
    };
  }, [nameKey, portraitUrl, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-x-0 top-0 -z-0 h-[100lvh] w-full select-none bg-[hsl(var(--background))]"
    />
  );
}
