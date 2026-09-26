import React, { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import { mulberry32, hashString } from '@/lib/diffusion/noise';

interface ScrollWordsProps {
  text: string;
  className?: string;
  as?: 'p' | 'div';
}

export function ScrollWords({ text, className, as = 'p' }: ScrollWordsProps) {
  const ref = useRef<HTMLElement>(null);

  const words = useMemo(() => {
    const rand = mulberry32(hashString(text));
    const parts = text.split(/\s+/).filter(Boolean);
    return parts.map((w, i) => ({ w, th: (i / parts.length) * 0.78 + rand() * 0.12 }));
  }, [text]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.setProperty('--p', '2');
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = (vh * 0.88 - rect.top) / (rect.height + vh * 0.35);
      el.style.setProperty('--p', Math.max(0, Math.min(1.2, p)).toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const Comp = as as React.ElementType;
  return (
    <Comp ref={ref} className={cn(className)}>
      {words.map((word, i) => (
        <React.Fragment key={i}>
          <span className="scroll-word" style={{ '--th': word.th.toFixed(3) } as React.CSSProperties}>
            {word.w}
          </span>{' '}
        </React.Fragment>
      ))}
    </Comp>
  );
}
