import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X, Paperclip, Minus, Maximize2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/mail-constants';
import { useCompose, type ComposeMode } from '@/hooks/useCompose';
import type { Email, EmailAccount } from '@shared/types';
import { AccountSelector } from './AccountSelector';
import { EmailFieldRow, FieldToggleButton } from './EmailFieldRow';
import { AttachmentList } from './AttachmentList';
import { SendButton } from './SendButton';

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: EmailAccount[];
  defaultFromAccount?: string;
  replyTo?: Email;
  replyAll?: boolean;
  forward?: Email;
}

export function ComposeDialog({
  open,
  onOpenChange,
  accounts,
  defaultFromAccount,
  replyTo,
  replyAll,
  forward,
}: ComposeDialogProps) {
  const [minimized, setMinimized] = useState(false);

  const mode: ComposeMode = forward
    ? 'forward'
    : replyAll
      ? 'replyAll'
      : replyTo
        ? 'reply'
        : 'new';

  const compose = useCompose({
    accounts,
    defaultFromAccount,
    replyTo: forward || replyTo,
    mode,
    onSuccess: () => onOpenChange(false),
  });

  const handleSaveDraft = async () => {
    try {
      await api(API_ENDPOINTS.DRAFTS, {
        method: 'POST',
        body: JSON.stringify({
          from: compose.fromAccount,
          to: compose.to,
          cc: compose.cc,
          bcc: compose.bcc,
          subject: compose.subject,
          body: compose.body,
        }),
      });
      toast.success('Draft saved');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast.error('Failed to save draft');
    }
  };

  if (minimized) {
    return (
      <div className="fixed bottom-0 right-4 w-72 bg-card border border-border rounded-t-lg shadow-lg z-50">
        <div className="flex items-center justify-between px-4 py-2 bg-muted rounded-t-lg">
          <span className="font-medium truncate">
            {compose.subject || 'New Message'}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setMinimized(false)}
              aria-label="Maximize"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const dialogTitle = replyTo ? 'Reply' : forward ? 'Forward' : 'New Message';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setMinimized(true)}
              aria-label="Minimize"
            >
              <Minus className="h-3 w-3" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-16 text-right text-sm text-muted-foreground">
                From
              </span>
              <AccountSelector
                accounts={accounts}
                value={compose.fromAccount}
                onChange={compose.setFromAccount}
                className="flex-1"
              />
            </div>

            <EmailFieldRow
              label="To"
              value={compose.to}
              onChange={compose.setTo}
              placeholder="recipient@example.com"
              actions={
                <>
                  {!compose.showCc && (
                    <FieldToggleButton label="Cc" onClick={() => compose.setShowCc(true)} />
                  )}
                  {!compose.showBcc && (
                    <FieldToggleButton label="Bcc" onClick={() => compose.setShowBcc(true)} />
                  )}
                </>
              }
            />

            {compose.showCc && (
              <EmailFieldRow
                label="Cc"
                value={compose.cc}
                onChange={compose.setCc}
                placeholder="cc@example.com"
              />
            )}

            {compose.showBcc && (
              <EmailFieldRow
                label="Bcc"
                value={compose.bcc}
                onChange={compose.setBcc}
                placeholder="bcc@example.com"
              />
            )}

            <EmailFieldRow
              label="Subject"
              value={compose.subject}
              onChange={compose.setSubject}
              placeholder="Subject"
            />
          </div>

          <Textarea
            value={compose.body}
            onChange={(e) => compose.setBody(e.target.value)}
            placeholder="Write your message..."
            className="min-h-[200px] resize-none"
          />

          <AttachmentList
            attachments={compose.attachments}
            onRemove={compose.removeAttachment}
          />
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <SendButton sending={compose.sending} onClick={compose.handleSend} />
            <Button variant="outline" onClick={compose.handleAttachClick} aria-label="Attach file">
              <Paperclip className="h-4 w-4" />
            </Button>
            <input
              ref={compose.fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={compose.handleFileChange}
            />
          </div>
          <Button variant="ghost" onClick={handleSaveDraft}>
            Save Draft
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
