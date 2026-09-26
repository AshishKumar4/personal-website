import React from 'react';
import { cn } from '@/lib/utils';

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1480px] px-5 sm:px-8 lg:px-12', className)}>{children}</div>;
}

interface SectionHeaderProps {
  label: string;
  title?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ label, title, aside, className }: SectionHeaderProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-y-5 border-t border-white/10 pt-6 md:grid-cols-12 md:gap-x-8', className)}>
      <div className="text-[0.8125rem] text-foreground/50 md:col-span-3">{label}</div>
      <div className="flex items-end justify-between gap-6 md:col-span-9">
        {title && <h2 className="max-w-3xl font-display text-[clamp(1.9rem,3.6vw,3.3rem)] font-[480] leading-[1.04] tracking-[-0.035em] text-foreground text-balance">{title}</h2>}
        {aside && <div className="shrink-0 text-[0.8125rem] text-foreground/50">{aside}</div>}
      </div>
    </div>
  );
}
