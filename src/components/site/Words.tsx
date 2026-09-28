import React from 'react';
import { cn } from '@/lib/utils';

interface WordsProps {
  text: string;
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  wdth?: string;
  id?: string;
}

export function Words({ text, as = 'h2', className, wdth = '125%', id }: WordsProps) {
  const Tag = as;
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <Tag id={id} className={cn('legible', className)} style={{ '--wdth': wdth } as React.CSSProperties}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <React.Fragment key={i}>
            <span className="w" style={{ '--i': i } as React.CSSProperties}>
              <span className="w-ghost">{word}</span>
              <span className="w-live">{word}</span>
            </span>
            {i < words.length - 1 && ' '}
          </React.Fragment>
        ))}
      </span>
    </Tag>
  );
}
