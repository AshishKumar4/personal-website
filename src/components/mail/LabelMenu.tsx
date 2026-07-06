import { Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMailContext } from '@/contexts/MailContext';

interface LabelMenuProps {
  activeLabels: string[];
  onToggle: (labelId: string, checked: boolean) => void;
}

export function LabelMenu({ activeLabels, onToggle }: LabelMenuProps) {
  const { labels } = useMailContext();
  const userLabels = labels.filter((l) => l.type === 'user');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Labels">
          <Tag className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Labels</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userLabels.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">No custom labels</div>
        ) : (
          userLabels.map((l) => (
            <DropdownMenuCheckboxItem
              key={l.id}
              checked={activeLabels.includes(l.id)}
              onCheckedChange={(checked) => onToggle(l.id, checked === true)}
              onSelect={(e) => e.preventDefault()}
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: l.color || 'hsl(var(--primary))' }}
                />
                {l.name}
              </span>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
