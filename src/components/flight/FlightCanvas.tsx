import { useEffect, useRef } from 'react';
import { TerrainRenderer } from '@/lib/flight/terrain-renderer';
import { clamp01, lookAt, multiply, pathX, perspective, project, smoothstep } from '@/lib/flight/math';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const FAR = 1400;
const CRUISE = 6.5;

export function FlightCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const veil = veilRef.current;
    if (!canvas || !veil) return;
    const small = window.innerWidth < 768;
    const renderer = TerrainRenderer.create(canvas, small ? 0.6 : 1, FAR);
    if (!renderer) {
      canvas.style.background = 'radial-gradient(ellipse at 34% 62%, #1b1812 0%, #07080c 60%)';
      return;
    }
    let raf = 0;
    let disposed = false;
    let visible = !document.hidden;
    let dpr = 1;
    let last = performance.now();
    const start = last;
    let cruise = 0;
    let scrollDist = window.scrollY * 0.32;
    let mouseX = 0;
    let mouseY = 0;
    let smx = 0;
    let smy = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    };

    const frame = (now: number) => {
      raf = 0;
      if (disposed) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) cruise += dt * CRUISE;
      const targetScroll = window.scrollY * 0.32;
      scrollDist += (targetScroll - scrollDist) * (reduced ? 1 : 1 - Math.exp(-dt * 3.2));
      smx += (mouseX - smx) * (1 - Math.exp(-dt * 2.5));
      smy += (mouseY - smy) * (1 - Math.exp(-dt * 2.5));
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = clamp01(window.scrollY / max);
      const dawn = smoothstep(0.8, 1, progress);
      const z = -(cruise + scrollDist);
      const alt = 205 + dawn * 60 + Math.sin(now * 0.00031) * 1.2;
      const x = pathX(z);
      const ahead = 420;
      const tx = pathX(z - ahead) + smx * 26;
      const slope = (pathX(z - 12) - pathX(z + 12)) / 24;
      const roll = -slope * 0.55 - smx * 0.05;
      const view = lookAt([x, alt, z], [tx, alt - 118 + smy * -30 + dawn * 50, z - ahead], roll);
      const aspect = canvas.width / Math.max(1, canvas.height);
      const proj = perspective((aspect < 1 ? 68 : 52) * Math.PI / 180, aspect, 0.5, FAR * 1.1);
      const viewProj = multiply(proj, view);
      const hz = project(viewProj, [tx, alt, z - 6000]);
      const intro = reduced ? 1 : smoothstep(0, 1, (now - start) / 3200);
      renderer.render({ viewProj, cam: [x, alt, z], horizon: hz[1] * 0.5 + 0.5, dawn, intro: 0.08 + intro * 0.92, far: FAR });
      const vh = window.innerHeight;
      const dim = smoothstep(vh * 0.15, vh * 0.95, window.scrollY) * (1 - dawn * 0.85);
      veil.style.opacity = (dim * 0.78).toFixed(3);
      if (!reduced && visible) raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (!raf && !disposed && visible) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onVis = () => {
      visible = !document.hidden;
      last = performance.now();
      kick();
    };
    const ro = new ResizeObserver(() => {
      resize();
      kick();
    });
    ro.observe(canvas);
    resize();
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', kick, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    kick();

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', kick);
      document.removeEventListener('visibilitychange', onVis);
      renderer.dispose();
    };
  }, [reduced]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-[100lvh] w-full">
      <canvas ref={canvasRef} className="h-full w-full bg-[#07080c]" />
      <div ref={veilRef} className="absolute inset-0 bg-[#07080c]" style={{ opacity: 0 }} />
    </div>
  );
}
