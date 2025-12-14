import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Email, EmailThread, EmailAccount } from '@shared/types';
import {
  Reply, ReplyAll, Forward, MoreVertical, Star, Trash2,
  Paperclip, Download, ArrowLeft
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DOMPurify from 'dompurify';
import { InlineCompose } from './InlineCompose';
import { formatRelativeTime, formatFullDate, formatFileSize } from '@/lib/date-utils';
import { getInitials } from '@/lib/text-utils';
import { getSenderName, extractNewContent, extractNewHtmlContent } from '@/lib/email-utils';

interface EmailReaderProps {
  thread: EmailThread;
  emails: Email[];
  accounts: EmailAccount[];
  onBack?: () => void;
  onDelete?: (threadId: string) => void;
  onToggleStar?: (threadId: string, starred: boolean) => void;
  onMarkUnread?: (threadId: string) => void;
  onEmailSent?: () => void;
}

type ComposeMode = 'reply' | 'replyAll' | 'forward' | null;

function EmailMessage({
  email,
  isLast,
  totalCount,
  index,
  onReply,
  onReplyAll,
  onForward,
}: {
  email: Email;
  isLast: boolean;
  totalCount: number;
  index: number;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
}) {
  const senderName = getSenderName(email);
  const isFirst = index === 0;

  const newTextContent = extractNewContent(email.textBody);
  const newHtmlContent = email.htmlBody ? extractNewHtmlContent(email.htmlBody) : null;

  const sanitizedHtml = newHtmlContent
    ? DOMPurify.sanitize(newHtmlContent, {
        ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'code', 'img', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'class'],
      })
    : null;

  const displayHtml = sanitizedHtml && sanitizedHtml.trim().length > 10;

  return (
    <div className="mb-4">
      <div className={cn(
        'rounded-xl border bg-card shadow-sm overflow-hidden',
        isLast && 'ring-1 ring-primary/20'
      )}>
        <div className="flex items-start gap-3 p-4 pb-2">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getInitials(senderName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">
                {senderName}
              </span>
              <span className="text-xs text-muted-foreground">
                &lt;{email.from}&gt;
              </span>
              <span
                className="ml-auto text-xs text-muted-foreground shrink-0"
                title={formatFullDate(email.createdAt)}
              >
                {formatRelativeTime(email.createdAt)}
              </span>
            </div>

            <div className="text-xs text-muted-foreground mt-0.5">
              <span>To: {email.to.join(', ')}</span>
              {email.cc && email.cc.length > 0 && (
                <span className="ml-2">Cc: {email.cc.join(', ')}</span>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 pt-2">
          <div className="pl-[52px]">
            {displayHtml ? (
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml! }}
              />
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {newTextContent || email.textBody || '(No content)'}
              </div>
            )}
          </div>

          {email.attachments.length > 0 && (
            <div className="mt-4 pl-[52px]">
              <Separator className="mb-3" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Paperclip className="h-4 w-4" />
                {email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}
              </div>
              <div className="flex flex-wrap gap-2">
                {email.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={`/api/mail/attachments/${email.id}/${attachment.id}`}
                    className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-sm"
                    download={attachment.filename}
                  >
                    <Download className="h-4 w-4" />
                    <span>{attachment.filename}</span>
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(attachment.size)})
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {isLast && (
            <div className="mt-4 pl-[52px] flex gap-2">
              <Button variant="outline" size="sm" onClick={onReply}>
                <Reply className="h-4 w-4 mr-1" />
                Reply
              </Button>
              <Button variant="outline" size="sm" onClick={onReplyAll}>
                <ReplyAll className="h-4 w-4 mr-1" />
                Reply All
              </Button>
              <Button variant="outline" size="sm" onClick={onForward}>
                <Forward className="h-4 w-4 mr-1" />
                Forward
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmailReader({
  thread,
  emails,
  accounts,
  onBack,
  onDelete,
  onToggleStar,
  onMarkUnread,
  onEmailSent,
}: EmailReaderProps) {
  const [composeMode, setComposeMode] = useState<ComposeMode>(null);
  const [composeEmail, setComposeEmail] = useState<Email | null>(null);

  if (emails.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No emails in this thread
      </div>
    );
  }

  const lastEmail = emails[emails.length - 1];

  const handleReply = (email: Email) => {
    setComposeEmail(email);
    setComposeMode('reply');
  };

  const handleReplyAll = (email: Email) => {
    setComposeEmail(email);
    setComposeMode('replyAll');
  };

  const handleForward = (email: Email) => {
    setComposeEmail(email);
    setComposeMode('forward');
  };

  const handleComposeDiscard = () => {
    setComposeMode(null);
    setComposeEmail(null);
  };

  const handleComposeSend = () => {
    setComposeMode(null);
    setComposeEmail(null);
    onEmailSent?.();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{thread.subject}</h1>
          {emails.length > 1 && (
            <p className="text-xs text-muted-foreground">
              {emails.length} messages in conversation
            </p>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className={cn(thread.starred && 'text-yellow-500')}
          onClick={() => onToggleStar?.(thread.id, !thread.starred)}
        >
          <Star className="h-4 w-4" fill={thread.starred ? 'currentColor' : 'none'} />
        </Button>

        <Button variant="ghost" size="icon" onClick={() => onDelete?.(thread.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onMarkUnread?.(thread.id)}>
              Mark as unread
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {emails.map((email, index) => (
          <EmailMessage
            key={email.id}
            email={email}
            isLast={index === emails.length - 1}
            totalCount={emails.length}
            index={index}
            onReply={() => handleReply(email)}
            onReplyAll={() => handleReplyAll(email)}
            onForward={() => handleForward(email)}
          />
        ))}

        {composeMode && composeEmail && (
          <div className="mt-4">
            <InlineCompose
              key={`${composeMode}-${composeEmail.id}`}
              mode={composeMode}
              email={composeEmail}
              accounts={accounts}
              defaultFromAccount={thread.account}
              onSend={handleComposeSend}
              onDiscard={handleComposeDiscard}
            />
          </div>
        )}
      </div>
    </div>
  );
}
