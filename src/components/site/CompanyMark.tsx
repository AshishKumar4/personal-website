import { useState } from 'react';
import { cn } from '@/lib/utils';

export function CompanyMark({ src, className, bare }: { src?: string; className?: string; bare?: boolean }) {
  const [failed, setFailed] = useState(false);
  const url = src?.trim();
  if (!url || failed) return null;
  const img = <img src={url} alt="" decoding="async" onError={() => setFailed(true)} className={cn('mark-img', bare && className)} />;
  if (bare) return img;
  return (
    <span aria-hidden="true" className={cn('mark-tile', className)}>
      {img}
    </span>
  );
}
