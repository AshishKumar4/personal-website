import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const GLYPHS = '░▒▓<>/\\|=+*#%01';

interface ScrambleTextProps {
  text: string;
  className?: string;
  duration?: number;
  trigger?: 'view' | 'mount';
}

export function ScrambleText({ text, className, duration = 700, trigger = 'view' }: ScrambleTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = text;
    if (reduced) return;
    let raf = 0;
    const run = () => {
      const start = performance.now();
      const order = [...text].map(() => Math.random());
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        let out = '';
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch === ' ' || order[i] * 0.6 + (i / text.length) * 0.4 < p) out += ch;
          else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
        el.textContent = out;
        if (p < 1) raf = requestAnimationFrame(tick);
        else el.textContent = text;
      };
      raf = requestAnimationFrame(tick);
    };
    if (trigger === 'mount') {
      run();
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        io.disconnect();
        run();
      }
    }, { threshold: 0.6 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [text, duration, trigger, reduced]);

  return (
    <span className={cn('whitespace-pre', className)}>
      <span className="sr-only">{text}</span>
      <span ref={ref} aria-hidden="true">{text}</span>
    </span>
  );
}
