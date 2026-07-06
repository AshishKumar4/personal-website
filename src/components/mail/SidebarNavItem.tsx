import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface SidebarNavItemProps {
  to?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  dotColor?: string;
  label: string;
  badge?: number;
  active?: boolean;
  muted?: boolean;
  trailing?: ReactNode;
}

export function SidebarNavItem({
  to,
  onClick,
  icon: Icon,
  dotColor,
  label,
  badge,
  active,
  muted,
  trailing,
}: SidebarNavItemProps) {
  const className = cn(
    'group flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left',
    active
      ? 'bg-primary/10 text-primary font-medium'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
    muted && 'opacity-60'
  );

  const content = (
    <>
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {dotColor && (
        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
      )}
      <span className="flex-1 truncate">{label}</span>
      {trailing}
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            'shrink-0 min-w-5 px-1.5 py-0.5 rounded-full text-[10px] leading-none text-center font-medium',
            active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
          )}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className} onClick={onClick}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
