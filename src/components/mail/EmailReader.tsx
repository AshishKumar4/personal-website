import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { Email, EmailThread, EmailAddress } from '@shared/types';
import {
  Reply, ReplyAll, Forward, MoreVertical, Star, Trash2,
  Paperclip, Download, ArrowLeft, ChevronDown, ChevronRight, ShieldOff, ImageOff, FileCode,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { InlineCompose } from './InlineCompose';
import { AccountChip } from './AccountChip';
import { LabelMenu } from './LabelMenu';
import { formatRelativeTime, formatFullDate, formatFileSize } from '@/lib/date-utils';
import { getInitials } from '@/lib/text-utils';
import { getSenderName } from '@/lib/email-utils';
import { renderEmailHtml, renderPlainText, buildEmailSrcDoc } from '@/lib/email-render';
import { API_ENDPOINTS, MIN_HTML_DISPLAY_LENGTH } from '@/lib/mail-constants';

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

interface IframeEmailBodyProps {
  bodyHtml: string;
  allowRemoteImages: boolean;
}

function IframeEmailBody({ bodyHtml, allowRemoteImages }: IframeEmailBodyProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [height, setHeight] = useState(200);

  const srcDoc = buildEmailSrcDoc(bodyHtml, { allowRemoteImages });

  const measure = useCallback(() => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!doc?.body) return;
    const h = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
    if (h > 0) setHeight(h);
  }, []);

  useEffect(() => {
    const frame = iframeRef.current;
    if (!frame) return;

    const handleLoad = () => {
      measure();
      const doc = frame.contentDocument;
      if (!doc) return;
      observerRef.current?.disconnect();
      const ro = new ResizeObserver(measure);
      ro.observe(doc.body);
      observerRef.current = ro;
      doc.querySelectorAll('img').forEach((img) => {
        if (!img.complete) img.addEventListener('load', measure, { once: true });
      });
    };

    frame.addEventListener('load', handleLoad);
    return () => {
      frame.removeEventListener('load', handleLoad);
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [srcDoc, measure]);

  return (
    <div className="w-full overflow-x-auto">
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        title="Email content"
        className="w-full border-0 block"
        style={{ height, minHeight: 40 }}
        scrolling="no"
      />
    </div>
  );
}

interface EmailMessageProps {
  email: Email;
  isLast: boolean;
  defaultExpanded: boolean;
  onReply?: () => void;
  onReplyAll?: () => void;
  onForward?: () => void;
}

function EmailMessage({
  email,
  isLast,
  defaultExpanded,
  onReply,
  onReplyAll,
  onForward,
}: EmailMessageProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showRemoteImages, setShowRemoteImages] = useState(false);
  const senderName = getSenderName(email);

  const rendered = useMemo(() => {
    if (email.htmlBody) {
      return renderEmailHtml(email.htmlBody, email, { allowRemoteImages: showRemoteImages });
    }
    if (email.textBody) {
      return { html: renderPlainText(email.textBody), blockedImageCount: 0 };
    }
    return { html: '', blockedImageCount: 0 };
  }, [email, showRemoteImages]);

  const hasContent = rendered.html.trim().length > MIN_HTML_DISPLAY_LENGTH;
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
          <div className="px-4 pb-4 pt-1">
            {rendered.blockedImageCount > 0 && !showRemoteImages && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <ImageOff className="h-4 w-4 shrink-0" />
                  Remote images blocked to protect your privacy
                </span>
                <Button variant="outline" size="sm" onClick={() => setShowRemoteImages(true)}>
                  Show images
                </Button>
              </div>
            )}
            {hasContent ? (
              <IframeEmailBody bodyHtml={rendered.html} allowRemoteImages={showRemoteImages} />
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

  const composeActive = composeMode !== null;
  const hk = { enabled: !composeActive && emails.length > 0 };
  const hkKey = { ...hk, useKey: true };
  useHotkeys('r', () => lastEmail && handleReply(lastEmail), hk, [lastEmail, composeActive]);
  useHotkeys('a', () => lastEmail && handleReplyAll(lastEmail), hk, [lastEmail, composeActive]);
  useHotkeys('f', () => lastEmail && handleForward(lastEmail), hk, [lastEmail, composeActive]);
  useHotkeys('s', () => onToggleStar?.(thread.id, !thread.starred), hk, [thread, composeActive]);
  useHotkeys('#', () => onDelete?.(thread.id), hkKey, [thread, composeActive]);
  useHotkeys('!', () => onSpam?.(thread.id), hkKey, [thread, composeActive]);

  if (emails.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No emails in this thread
      </div>
    );
  }

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
            {lastEmail && (
              <DropdownMenuItem asChild>
                <a
                  href={API_ENDPOINTS.EMAIL_RAW(lastEmail.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileCode className="h-4 w-4 mr-2" />
                  View original
                </a>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {emails.map((email, index) => (
          <EmailMessage
            key={email.id}
            email={email}
            isLast={index === emails.length - 1}
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
