import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface EmailFieldRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  labelWidth?: string;
  actions?: React.ReactNode;
}

export function EmailFieldRow({
  label,
  value,
  onChange,
  placeholder,
  labelWidth = '4rem',
  actions,
}: EmailFieldRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Label
        className="text-right text-sm text-muted-foreground flex-shrink-0"
        style={{ width: labelWidth }}
      >
        {label}
      </Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      {actions}
    </div>
  );
}

interface ToggleButtonProps {
  label: string;
  onClick: () => void;
}

export function FieldToggleButton({ label, onClick }: ToggleButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs"
      onClick={onClick}
      type="button"
    >
      {label}
    </Button>
  );
}
