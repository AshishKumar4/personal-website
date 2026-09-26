import React from 'react';
import { cn } from '@/lib/utils';

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1480px] px-5 sm:px-8 lg:px-12', className)}>{children}</div>;
}

interface SectionHeaderProps {
  label: string;
  mark?: string;
  title?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ label, mark, title, aside, className }: SectionHeaderProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-y-7 md:grid-cols-12 md:gap-x-8', className)}>
      <div className="t-kicker flex items-center gap-4 text-foreground/55 md:col-span-12">
        {mark && <span className="text-[hsl(var(--tone))]">{mark}</span>}
        {mark && <span aria-hidden="true" className="h-px w-10 bg-foreground/25" />}
        <span>{label}</span>
      </div>
      {title && (
        <h2 className="t-section legible max-w-[16ch] text-[clamp(2.25rem,5vw,4.75rem)] text-foreground text-balance md:col-span-9">
          {title}
        </h2>
      )}
      {aside && <div className="self-end text-[0.875rem] text-foreground/60 md:col-span-3 md:justify-self-end">{aside}</div>}
    </div>
  );
}
