import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCompose, type ComposeMode } from '@/hooks/useCompose';
import type { Email, EmailAccount } from '@shared/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AttachmentList } from './AttachmentList';
import { SendButton } from './SendButton';

interface InlineComposeProps {
  mode: ComposeMode;
  email: Email;
  accounts: EmailAccount[];
  defaultFromAccount?: string;
  onSend: () => void;
  onDiscard: () => void;
}

export function InlineCompose({
  mode,
  email,
  accounts,
  defaultFromAccount,
  onSend,
  onDiscard,
}: InlineComposeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const compose = useCompose({
    accounts,
    defaultFromAccount,
    replyTo: email,
    mode,
    onSuccess: onSend,
  });

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const modeLabel = mode === 'reply' ? 'Reply' : mode === 'replyAll' ? 'Reply All' : 'Forward';

  return (
    <div className="border border-border rounded-lg bg-card mx-4 mb-4 overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 text-sm">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
                {modeLabel}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem disabled>{modeLabel}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-muted-foreground">from</span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 font-normal">
                {compose.fromAccount}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {accounts.map((account) => (
                <DropdownMenuItem
                  key={account.address}
                  onClick={() => compose.setFromAccount(account.address)}
                  className={cn(compose.fromAccount === account.address && 'bg-accent')}
                >
                  {account.address}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground w-8">To</span>
          <Input
            value={compose.to}
            onChange={(e) => compose.setTo(e.target.value)}
            placeholder={mode === 'forward' ? 'Enter recipient email' : ''}
            className="flex-1 h-8 text-sm"
          />
          {!compose.showCc && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => compose.setShowCc(true)}
            >
              Cc
            </Button>
          )}
          {!compose.showBcc && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => compose.setShowBcc(true)}
            >
              Bcc
            </Button>
          )}
        </div>

        {compose.showCc && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-8">Cc</span>
            <Input
              value={compose.cc}
              onChange={(e) => compose.setCc(e.target.value)}
              className="flex-1 h-8 text-sm"
            />
          </div>
        )}

        {compose.showBcc && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-8">Bcc</span>
            <Input
              value={compose.bcc}
              onChange={(e) => compose.setBcc(e.target.value)}
              className="flex-1 h-8 text-sm"
            />
          </div>
        )}

        <Textarea
          ref={textareaRef}
          value={compose.body}
          onChange={(e) => compose.setBody(e.target.value)}
          placeholder="Write your message..."
          className="min-h-[150px] resize-none text-sm"
        />

        <AttachmentList
          attachments={compose.attachments}
          onRemove={compose.removeAttachment}
          maxWidth="120px"
        />
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-muted/30">
        <SendButton sending={compose.sending} onClick={compose.handleSend} size="sm" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={compose.handleAttachClick}
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <input
          ref={compose.fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={compose.handleFileChange}
        />
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onDiscard}
          aria-label="Discard"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
