import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Email, EmailThread, EmailAddress } from '@shared/types';
import {
  Reply, ReplyAll, Forward, MoreVertical, Star, Trash2,
  Paperclip, Download, ArrowLeft, ChevronDown, ChevronRight, ShieldOff,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DOMPurify from 'dompurify';
import { InlineCompose } from './InlineCompose';
import { AccountChip } from './AccountChip';
import { LabelMenu } from './LabelMenu';
import { formatRelativeTime, formatFullDate, formatFileSize } from '@/lib/date-utils';
import { getInitials } from '@/lib/text-utils';
import { getSenderName, extractNewContent, extractNewHtmlContent } from '@/lib/email-utils';
import { DOMPURIFY_CONFIG } from '@/lib/mail-constants';

interface EmailReaderProps {
  thread: EmailThread;
  emails: Email[];
  addresses: EmailAddress[];
  onBack?: () => void;
  onDelete?: (threadId: string) => void;
  onToggleStar?: (threadId: string, starred: boolean) => void;
  onMarkUnread?: (threadId: string) => void;
  onSpam?: (threadId: string) => void;
  onToggleLabel?: (labelId: string, checked: boolean) => void;
  onEmailSent?: () => void;
}

type ComposeMode = 'reply' | 'replyAll' | 'forward' | null;

// Minimal CSS injected into the iframe so text is readable without clobbering email styles.
// Deliberately light — only sets defaults that emails commonly omit.
const IFRAME_BASE_CSS = `
  html, body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #1a1a1a;
    background: transparent;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  img { max-width: 100%; height: auto; display: block; }
  a { color: #1a73e8; }
  table { border-spacing: 0; }
  blockquote { border-left: 3px solid #ccc; margin: 8px 0; padding: 4px 12px; color: #555; }
  pre, code { font-family: 'Fira Code', 'Roboto Mono', monospace; }
`;

function resolveCidUrls(html: string, email: Email): string {
  if (!html.includes('cid:')) return html;
  return html.replace(/src="cid:([^"]+)"/gi, (_, cid) => {
    const normalizedCid = cid.replace(/^<|>$/g, '');
    const attachment = email.attachments.find(
      (a) => a.contentId === normalizedCid || a.contentId === `<${normalizedCid}>`
    );
    if (!attachment) return 'src=""';
    return `src="/api/mail/attachments/${email.id}/${attachment.id}"`;
  });
}

function buildIframeSrcdoc(html: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${IFRAME_BASE_CSS}</style></head><body>${html}</body></html>`;
}

interface IframeEmailBodyProps {
  html: string;
}

function IframeEmailBody({ html }: IframeEmailBodyProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  const updateHeight = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame?.contentDocument?.body) return;
    const newHeight = frame.contentDocument.documentElement.scrollHeight;
    if (newHeight > 0) setHeight(newHeight);
  }, []);

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;

    const handleLoad = () => {
      updateHeight();
      // Watch for any dynamic height changes (images loading, etc.)
      if (!frame.contentDocument) return;
      const ro = new ResizeObserver(updateHeight);
      ro.observe(frame.contentDocument.body);
      return () => ro.disconnect();
    };

    frame.addEventListener('load', handleLoad);
    return () => frame.removeEventListener('load', handleLoad);
  }, [html, updateHeight]);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={buildIframeSrcdoc(html)}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      title="Email content"
      className="w-full border-0 block"
      style={{ height, minHeight: 40 }}
      scrolling="no"
    />
  );
}

interface EmailMessageProps {
  email: Email;
  isLast: boolean;
  index: number;
  defaultExpanded: boolean;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
}

function EmailMessage({
  email,
  isLast,
  index,
  defaultExpanded,
  onReply,
  onReplyAll,
  onForward,
}: EmailMessageProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const senderName = getSenderName(email);
  const isReply = Boolean(email.inReplyTo);

  const htmlContent = (() => {
    if (!email.htmlBody) return null;
    // Only strip reply-quote boilerplate from actual reply emails
    const extracted = isReply ? extractNewHtmlContent(email.htmlBody) : email.htmlBody;
    const withCids = resolveCidUrls(extracted, email);
    return DOMPurify.sanitize(withCids, {
      ALLOWED_TAGS: [...DOMPURIFY_CONFIG.ALLOWED_TAGS],
      ALLOWED_ATTR: [...DOMPURIFY_CONFIG.ALLOWED_ATTR],
      FORCE_BODY: DOMPURIFY_CONFIG.FORCE_BODY,
    });
  })();

  const textContent = (() => {
    if (email.htmlBody) return null;
    return isReply ? extractNewContent(email.textBody) : (email.textBody || '');
  })();

  const hasContent = Boolean(htmlContent && htmlContent.trim().length > 10) || Boolean(textContent);

  const collapsedPreview = email.snippet || (email.textBody?.slice(0, 80) ?? '');

  return (
    <div className="mb-3">
      <div className={cn(
        'rounded-xl border bg-card shadow-sm overflow-hidden',
        isLast && 'ring-1 ring-primary/20',
      )}>
        {/* Header — always visible, click to toggle */}
        <button
          type="button"
          className="w-full text-left flex items-start gap-3 p-4 pb-3 hover:bg-muted/30 transition-colors"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <Avatar className="h-10 w-10 shrink-0 mt-0.5">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getInitials(senderName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">{senderName}</span>
              <span className="text-xs text-muted-foreground">&lt;{email.from}&gt;</span>
              <span
                className="ml-auto text-xs text-muted-foreground shrink-0"
                title={formatFullDate(email.createdAt)}
              >
                {formatRelativeTime(email.createdAt)}
              </span>
            </div>

            {expanded ? (
              <div className="text-xs text-muted-foreground mt-0.5">
                <span>To: {email.to.join(', ')}</span>
                {email.cc && email.cc.length > 0 && (
                  <span className="ml-2">Cc: {email.cc.join(', ')}</span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground truncate mt-0.5">{collapsedPreview}</p>
            )}
          </div>

          <span className="shrink-0 text-muted-foreground mt-1">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        </button>

        {/* Body — only rendered when expanded */}
        {expanded && (
          <div className="px-4 pb-4 pt-1 pl-[64px]">
            {hasContent ? (
              htmlContent && htmlContent.trim().length > 10 ? (
                <IframeEmailBody html={htmlContent} />
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {textContent || '(No content)'}
                </div>
              )
            ) : (
              <div className="text-sm text-muted-foreground italic">(No content)</div>
            )}

            {email.attachments.filter((a) => a.disposition !== 'inline').length > 0 && (
              <div className="mt-4">
                <Separator className="mb-3" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Paperclip className="h-4 w-4" />
                  {email.attachments.filter((a) => a.disposition !== 'inline').length} attachment
                  {email.attachments.filter((a) => a.disposition !== 'inline').length > 1 ? 's' : ''}
                </div>
                <div className="flex flex-wrap gap-2">
                  {email.attachments
                    .filter((a) => a.disposition !== 'inline')
                    .map((attachment) => (
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
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onReply?.(); }}>
                  <Reply className="h-4 w-4 mr-1" />
                  Reply
                </Button>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onReplyAll?.(); }}>
                  <ReplyAll className="h-4 w-4 mr-1" />
                  Reply All
                </Button>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onForward?.(); }}>
                  <Forward className="h-4 w-4 mr-1" />
                  Forward
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmailReader({
  thread,
  emails,
  addresses,
  onBack,
  onDelete,
  onToggleStar,
  onMarkUnread,
  onSpam,
  onToggleLabel,
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
          <div className="flex items-center gap-2">
            <AccountChip account={thread.account} addresses={addresses} />
            {emails.length > 1 && (
              <p className="text-xs text-muted-foreground">
                {emails.length} messages in conversation
              </p>
            )}
          </div>
        </div>

        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={thread.starred ? 'Unstar' : 'Star'}
                className={cn(thread.starred && 'text-yellow-500')}
                onClick={() => onToggleStar?.(thread.id, !thread.starred)}
              >
                <Star className="h-4 w-4" fill={thread.starred ? 'currentColor' : 'none'} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{thread.starred ? 'Unstar' : 'Star'}</TooltipContent>
          </Tooltip>

          {onToggleLabel && <LabelMenu activeLabels={thread.labels} onToggle={onToggleLabel} />}

          {onSpam && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Spam & block sender"
                  className="hover:text-destructive"
                  onClick={() => onSpam(thread.id)}
                >
                  <ShieldOff className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Spam &amp; block sender</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Trash" onClick={() => onDelete?.(thread.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Trash</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More actions">
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
            index={index}
            defaultExpanded={index === emails.length - 1}
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
              addresses={addresses}
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
