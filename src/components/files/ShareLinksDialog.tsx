import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Link2, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { getErrorMessage } from '@/lib/error-utils';
import { formatDate, shareUrl } from '@/lib/file-utils';
import { formatFullDate, formatTimeUntil } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { CreateShareLinkPayload, R2FileItem, ShareLink } from '@shared/types';

const EXPIRY_OPTIONS = [
  { value: '3600', label: '1 hour' },
  { value: '86400', label: '1 day' },
  { value: '604800', label: '7 days' },
  { value: '2592000', label: '30 days' },
  { value: 'never', label: 'Never' },
];

interface ShareLinksDialogProps {
  file: R2FileItem | null;
  links: ShareLink[];
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

async function copyLink(link: ShareLink) {
  try {
    await navigator.clipboard.writeText(shareUrl(link.id));
    toast.success('Link copied');
  } catch {
    toast.error('Failed to copy');
  }
}

export function ShareLinksDialog({ file, links, onOpenChange, onChanged }: ShareLinksDialogProps) {
  const [expiry, setExpiry] = useState('604800');
  const [creating, setCreating] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<ShareLink | null>(null);
  const fileLinks = links.filter(link => link.key === file?.key);

  const handleCreate = async () => {
    if (!file) return;
    setCreating(true);
    try {
      const payload: CreateShareLinkPayload = { key: file.key, ttlSeconds: expiry === 'never' ? null : Number(expiry) };
      const link = await api<ShareLink>('/api/shares', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      onChanged();
      await navigator.clipboard.writeText(shareUrl(link.id)).then(
        () => toast.success('Link created and copied'),
        () => toast.success('Link created'),
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (link: ShareLink) => {
    try {
      await api(`/api/shares/${link.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      toast.success('Link revoked');
      onChanged();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 pr-6">
            <Link2 className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">Share {file?.name}</span>
          </DialogTitle>
          <DialogDescription>
            Anyone with a link can open this file. Revoking a link stops it working straight away.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label className="text-muted-foreground">Expires after</Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Create link
          </Button>
        </div>

        <div className="min-w-0 space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Active links</div>
          {fileLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active links. Only you can reach this file.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {fileLinks.map(link => (
                <li key={link.id} className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <code className="block truncate font-mono text-xs text-foreground" title={shareUrl(link.id)}>
                      {shareUrl(link.id)}
                    </code>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span title={formatFullDate(link.createdAt)}>Created {formatDate(link.createdAt)}</span>
                      {link.expiresAt === null ? (
                        <Badge variant="secondary" className="font-normal">Never expires</Badge>
                      ) : (
                        <Badge variant="secondary" className="font-normal" title={formatFullDate(link.expiresAt)}>
                          Expires {formatDate(link.expiresAt)} · {formatTimeUntil(link.expiresAt)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Copy link" onClick={() => copyLink(link)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Revoke link"
                    onClick={() => setConfirmRevoke(link)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={!!confirmRevoke} onOpenChange={(open) => !open && setConfirmRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this link?</AlertDialogTitle>
            <AlertDialogDescription>
              Anyone who has it gets a not-found page from now on. Other links to this file keep working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmRevoke) handleRevoke(confirmRevoke);
                setConfirmRevoke(null);
              }}
            >
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
