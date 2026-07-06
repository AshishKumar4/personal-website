import { cn } from '@/lib/utils';
import { KIND_META } from '@/lib/mail-constants';
import type { EmailAddress } from '@shared/types';

interface AccountChipProps {
  account: string;
  addresses: EmailAddress[];
  className?: string;
}

export function AccountChip({ account, addresses, className }: AccountChipProps) {
  const address = addresses.find((a) => a.id === account);
  const Icon = address ? KIND_META[address.kind].icon : null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/50 bg-muted text-muted-foreground text-[10px] leading-4 shrink-0',
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {account}
    </span>
  );
}
