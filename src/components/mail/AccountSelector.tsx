import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KIND_META } from '@/lib/mail-constants';
import type { EmailAddress } from '@shared/types';

interface AccountSelectorProps {
  addresses: EmailAddress[];
  value: string;
  onChange: (address: string) => void;
  className?: string;
}

export function AccountSelector({
  addresses,
  value,
  onChange,
  className,
}: AccountSelectorProps) {
  const selectable = addresses.filter((a) => a.status === 'active');

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {selectable.map((address) => {
          const Icon = KIND_META[address.kind].icon;
          return (
            <SelectItem key={address.address} value={address.address}>
              <span className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                {address.address}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
