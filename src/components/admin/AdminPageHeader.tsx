import React from 'react';

interface AdminPageHeaderProps {
  kicker: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AdminPageHeader({ kicker, title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">{kicker}</div>
        <h1 className="mt-2 font-display text-5xl leading-none tracking-[-0.02em] text-foreground">{title}</h1>
        {description && <p className="mt-3 max-w-xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
