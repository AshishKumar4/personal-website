import React from 'react';
import { cn } from '@/lib/utils';
import { ScrambleText } from '@/components/diffusion/ScrambleText';
import { ResolveText } from '@/components/diffusion/ResolveText';

interface SectionHeaderProps {
  index: number;
  kicker: string;
  title: string;
  note?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ index, kicker, title, note, className }: SectionHeaderProps) {
  return (
    <header className={cn('grid grid-cols-1 gap-y-6 border-t border-line/15 pt-6 md:grid-cols-12 md:gap-x-8', className)}>
      <div className="md:col-span-3">
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span className="text-signal">§{String(index).padStart(2, '0')}</span>
          <ScrambleText text={kicker} />
        </div>
      </div>
      <div className="md:col-span-9">
        <ResolveText as="h2" text={title} className="display text-[clamp(3.25rem,9vw,9.5rem)] text-foreground" />
        {note && <div className="mt-5 max-w-2xl font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-muted-foreground">{note}</div>}
      </div>
    </header>
  );
}

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:px-12', className)}>{children}</div>;
}
