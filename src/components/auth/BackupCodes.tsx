import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Check, Download, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackupCodesProps {
  codes: string[];
  onDone?: () => void;
  doneLabel?: string;
}

export function BackupCodes({ codes, onDone, doneLabel = 'Done' }: BackupCodesProps) {
  const [copied, setCopied] = useState(false);
  const text = codes.join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Backup codes copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const download = () => {
    const blob = new Blob([`CodePrint admin backup codes\n\n${text}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codeprint-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-sm">
        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <span>Save these backup codes somewhere safe. Each works once if you lose your device — they won&apos;t be shown again.</span>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/40 p-3 font-mono text-sm">
        {codes.map((code) => (
          <span key={code} className="text-center">{code}</span>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />} Copy
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={download}>
          <Download className="h-4 w-4 mr-1" /> Download
        </Button>
        {onDone && <Button type="button" className="ml-auto" onClick={onDone}>{doneLabel}</Button>}
      </div>
    </div>
  );
}
