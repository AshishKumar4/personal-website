import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EmailAccount } from '@shared/types';

interface AccountSelectorProps {
  accounts: EmailAccount[];
  value: string;
  onChange: (address: string) => void;
  className?: string;
}

export function AccountSelector({
  accounts,
  value,
  onChange,
  className,
}: AccountSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((account) => (
          <SelectItem key={account.address} value={account.address}>
            {account.address}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
