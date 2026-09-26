import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { alphaBar } from '@/lib/diffusion/schedule';
import { gaussianBuffer, renderNoisy } from '@/lib/diffusion/noise';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface DenoiseImageProps {
  src?: string;
  alt: string;
  draw?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  drawKey?: string;
  seed?: number;
  className?: string;
  imgClassName?: string;
  latentWidth?: number;
  hoverNoise?: number;
  eager?: boolean;
  focal?: { x: number; y: number };
}

function isSameOrigin(src: string): boolean {
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

function coverDraw(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number, focal: { x: number; y: number }) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = Math.min(0, Math.max(w - dw, w / 2 - focal.x * dw));
  const dy = Math.min(0, Math.max(h - dh, h / 2 - focal.y * dh));
  ctx.drawImage(img, dx, dy, dw, dh);
}

export function DenoiseImage({
  src,
  alt,
  draw,
  drawKey,
  seed = 1,
  className,
  imgClassName,
  latentWidth = 128,
  hoverNoise = 0.42,
  eager = false,
  focal = { x: 0.5, y: 0.5 },
}: DenoiseImageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const crispRef = useRef<HTMLCanvasElement>(null);
  const noiseRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const reduced = useReducedMotion();
  const fx = focal.x;
  const fy = focal.y;

  useEffect(() => {
    const wrap = wrapRef.current;
    const noiseCanvas = noiseRef.current;
    if (!wrap || !noiseCanvas) return;
    const nctx = noiseCanvas.getContext('2d');
    if (!nctx) return;
    let disposed = false;
    let raf = 0;
    let inView = false;
    let revealed = false;
    let loaded = !src;
    let x0: Uint8ClampedArray | null = null;
    let eps: Float32Array | null = null;
    let frameData: ImageData | null = null;
    let lw = latentWidth;
    let lh = Math.round(latentWidth * 0.5625);
    let current = 1;
    let busy = false;

    const setOverlay = (visible: boolean) => {
      noiseCanvas.style.opacity = visible ? '1' : '0';
    };

    const paint = (t: number) => {
      if (!eps || !frameData) return;
      const a = alphaBar(t);
      renderNoisy(frameData, x0, eps, Math.sqrt(a), Math.sqrt(1 - a));
      nctx.putImageData(frameData, 0, 0);
      current = t;
    };

    const drawCrisp = () => {
      const crisp = crispRef.current;
      const fn = drawRef.current;
      if (!crisp || !fn) return;
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      crisp.width = Math.max(1, Math.round(rect.width * dpr));
      crisp.height = Math.max(1, Math.round(rect.height * dpr));
      const c = crisp.getContext('2d');
      if (!c) return;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      fn(c, rect.width, rect.height);
    };

    const extract = () => {
      const off = document.createElement('canvas');
      off.width = lw;
      off.height = lh;
      const c = off.getContext('2d', { willReadFrequently: true });
      if (!c) return;
      try {
        if (drawRef.current) {
          c.save();
          c.scale(lw / Math.max(1, wrap.clientWidth), lh / Math.max(1, wrap.clientHeight));
          drawRef.current(c, wrap.clientWidth, wrap.clientHeight);
          c.restore();
          x0 = c.getImageData(0, 0, lw, lh).data;
        } else if (imgRef.current && src && isSameOrigin(src) && imgRef.current.naturalWidth > 0) {
          coverDraw(c, imgRef.current, lw, lh, { x: fx, y: fy });
          x0 = c.getImageData(0, 0, lw, lh).data;
        }
      } catch {
        x0 = null;
      }
    };

    const prepare = () => {
      const rect = wrap.getBoundingClientRect();
      const aspect = rect.width > 0 ? rect.height / rect.width : 0.5625;
      lw = latentWidth;
      lh = Math.max(8, Math.round(latentWidth * aspect));
      noiseCanvas.width = lw;
      noiseCanvas.height = lh;
      eps = gaussianBuffer(lw * lh * 3, seed);
      frameData = nctx.createImageData(lw, lh);
      drawCrisp();
      if (loaded) extract();
      paint(current);
    };

    const animate = (keys: [number, number, number][], done?: () => void) => {
      busy = true;
      let k = 0;
      let start = performance.now();
      const tick = (now: number) => {
        if (disposed) return;
        const [from, to, dur] = keys[k];
        const p = Math.min(1, (now - start) / dur);
        const steps = Math.max(6, Math.round(dur / 45));
        const q = Math.round(p * steps) / steps;
        paint(from + (to - from) * q);
        if (p >= 1) {
          k++;
          start = now;
          if (k >= keys.length) {
            busy = false;
            raf = 0;
            done?.();
            return;
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const reveal = () => {
      if (revealed || !inView || !loaded) return;
      revealed = true;
      extract();
      if (reduced) {
        paint(0);
        setOverlay(false);
        return;
      }
      setOverlay(true);
      animate([[1, 0, 1300]], () => setOverlay(false));
    };

    const onEnter = () => {
      if (!revealed || busy || reduced) return;
      setOverlay(true);
      animate([[0, hoverNoise, 220], [hoverNoise, 0, 620]], () => setOverlay(false));
    };

    const onLoad = () => {
      loaded = true;
      extract();
      reveal();
    };

    const img = imgRef.current;
    if (img) {
      if (img.complete && img.naturalWidth > 0) loaded = true;
      else {
        img.addEventListener('load', onLoad);
        img.addEventListener('error', onLoad);
      }
    }

    prepare();
    if (reduced) setOverlay(false);

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) reveal();
    }, { threshold: 0.2 });
    io.observe(wrap);

    const ro = new ResizeObserver(() => {
      if (!busy) prepare();
    });
    ro.observe(wrap);

    const mo = new MutationObserver(() => {
      if (drawRef.current && !busy) {
        drawCrisp();
        extract();
      }
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-accent'] });

    wrap.addEventListener('pointerenter', onEnter);

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      wrap.removeEventListener('pointerenter', onEnter);
      img?.removeEventListener('load', onLoad);
      img?.removeEventListener('error', onLoad);
    };
  }, [src, seed, latentWidth, hoverNoise, reduced, fx, fy, drawKey]);

  return (
    <div ref={wrapRef} className={cn('relative overflow-hidden bg-card', className)}>
      {src ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className={cn('absolute inset-0 h-full w-full object-cover', imgClassName)}
          style={{ objectPosition: `${fx * 100}% ${fy * 100}%` }}
        />
      ) : (
        <canvas ref={crispRef} role="img" aria-label={alt} className="absolute inset-0 h-full w-full" />
      )}
      <canvas
        ref={noiseRef}
        aria-hidden="true"
        className="pixelated pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500"
      />
    </div>
  );
}
