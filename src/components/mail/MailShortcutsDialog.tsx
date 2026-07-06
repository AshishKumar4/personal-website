import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'c', label: 'Compose' },
  { keys: '/', label: 'Search' },
  { keys: 'j', label: 'Next thread' },
  { keys: 'k', label: 'Previous thread' },
  { keys: 'e', label: 'Archive open thread' },
  { keys: 'r', label: 'Reply' },
  { keys: 'a', label: 'Reply all' },
  { keys: 'f', label: 'Forward' },
  { keys: 's', label: 'Star / unstar' },
  { keys: '#', label: 'Trash' },
  { keys: '!', label: 'Report spam' },
  { keys: 'Esc', label: 'Back to list' },
  { keys: '?', label: 'This help' },
];

interface MailShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MailShortcutsDialog({ open, onOpenChange }: MailShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-1.5">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <kbd className="min-w-6 text-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
