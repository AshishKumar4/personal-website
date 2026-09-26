import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { mulberry32, hashString } from '@/lib/diffusion/noise';

type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div';

interface ResolveTextProps {
  text: string;
  as?: Tag;
  className?: string;
  delay?: number;
  spread?: number;
  italicWords?: string[];
}

export function ResolveText({ text, as = 'span', className, delay = 0, spread = 700, italicWords = [] }: ResolveTextProps) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShown(true);
        io.disconnect();
      }
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const words = useMemo(() => {
    const rand = mulberry32(hashString(text));
    let index = 0;
    const all = text.split(/(\s+)/);
    const total = text.replace(/\s+/g, '').length || 1;
    return all.map(word => {
      if (/^\s+$/.test(word)) return { space: true as const, word };
      const chars = [...word].map(ch => {
        const order = index++ / total;
        const d = delay + (order * 0.55 + rand() * 0.45) * spread;
        return { ch, d: Math.round(d) };
      });
      const clean = word.replace(/[^\w'-]/g, '');
      return { space: false as const, word, chars, italic: italicWords.includes(clean) };
    });
  }, [text, delay, spread, italicWords]);

  const Comp = as as React.ElementType;
  return (
    <Comp ref={ref} className={cn('resolve', shown && 'resolve-in', className)} aria-label={text}>
      {words.map((w, i) =>
        w.space ? (
          <span key={i} aria-hidden="true"> </span>
        ) : (
          <span key={i} aria-hidden="true" className={cn('inline-block whitespace-nowrap', w.italic && 'italic')}>
            {w.chars.map((c, j) => (
              <span key={j} className="resolve-ch" style={{ transitionDelay: `${c.d}ms` }}>
                {c.ch}
              </span>
            ))}
          </span>
        ),
      )}
    </Comp>
  );
}
