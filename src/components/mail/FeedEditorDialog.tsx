import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { isValidEmail } from '@/lib/email-utils';
import { API_ENDPOINTS, MAIL_ROUTES, FEED_COLORS, KIND_META } from '@/lib/mail-constants';
import { useMailContext } from '@/contexts/MailContext';
import type { EmailFeed } from '@shared/types';

interface FeedEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feed?: EmailFeed;
}

export function FeedEditorDialog({ open, onOpenChange, feed }: FeedEditorDialogProps) {
  const navigate = useNavigate();
  const { addresses, refreshFeeds } = useMailContext();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(FEED_COLORS[0]);
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [senders, setSenders] = useState<string[]>([]);
  const [senderInput, setSenderInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(feed?.name ?? '');
    setColor(feed?.color || FEED_COLORS[0]);
    setAccountIds(feed?.accountIds ?? []);
    setSenders(feed?.senders ?? []);
    setSenderInput('');
  }, [open, feed]);

  const commitSenderInput = (): string[] | null => {
    const value = senderInput.trim().replace(/,$/, '');
    if (!value) return senders;
    if (!isValidEmail(value)) {
      toast.error(`Invalid sender address: ${value}`);
      return null;
    }
    const normalized = value.toLowerCase();
    setSenderInput('');
    if (senders.includes(normalized)) return senders;
    const next = [...senders, normalized];
    setSenders(next);
    return next;
  };

  const handleSenderKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitSenderInput();
    } else if (e.key === 'Backspace' && !senderInput && senders.length > 0) {
      setSenders(senders.slice(0, -1));
    }
  };

  const toggleAccount = (id: string, checked: boolean) => {
    setAccountIds((prev) => (checked ? [...prev, id] : prev.filter((a) => a !== id)));
  };

  const handleSave = async () => {
    const committedSenders = commitSenderInput();
    if (committedSenders === null) return;
    if (!name.trim()) {
      toast.error('Feed name is required');
      return;
    }
    if (accountIds.length === 0 && committedSenders.length === 0) {
      toast.error('Select at least one address or sender');
      return;
    }
    setSaving(true);
    try {
      const body = JSON.stringify({ name: name.trim(), color, accountIds, senders: committedSenders });
      if (feed) {
        await api<EmailFeed>(API_ENDPOINTS.FEED(feed.id), { method: 'PUT', body });
        toast.success('Feed updated');
      } else {
        const created = await api<EmailFeed>(API_ENDPOINTS.FEEDS, { method: 'POST', body });
        toast.success('Feed created');
        navigate(MAIL_ROUTES.FEED(created.id));
      }
      await refreshFeeds();
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{feed ? 'Edit feed' : 'New feed'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feed-name">Name</Label>
            <Input
              id="feed-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Job Hunt"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {FEED_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Feed color ${c}`}
                  className={cn(
                    'h-6 w-6 rounded-full transition-transform hover:scale-110',
                    color === c && 'ring-2 ring-ring ring-offset-2 ring-offset-background'
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>My addresses</Label>
            <ScrollArea className="max-h-40 rounded-md border border-border">
              <div className="p-2 space-y-1">
                {addresses.map((address) => {
                  const Icon = KIND_META[address.kind].icon;
                  return (
                    <label
                      key={address.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={accountIds.includes(address.id)}
                        onCheckedChange={(checked) => toggleAccount(address.id, checked === true)}
                      />
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{address.address}</span>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feed-senders">Important senders</Label>
            {senders.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {senders.map((sender) => (
                  <Badge key={sender} variant="secondary" className="gap-1 font-normal">
                    {sender}
                    <button
                      type="button"
                      aria-label={`Remove ${sender}`}
                      onClick={() => setSenders(senders.filter((s) => s !== sender))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Input
              id="feed-senders"
              value={senderInput}
              onChange={(e) => setSenderInput(e.target.value)}
              onKeyDown={handleSenderKeyDown}
              onBlur={() => commitSenderInput()}
              placeholder="recruiter@example.com — press Enter to add"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : feed ? 'Save changes' : 'Create feed'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
