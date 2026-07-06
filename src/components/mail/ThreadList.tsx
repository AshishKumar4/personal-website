import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Star, AlertCircle, RefreshCw, Archive, Trash2, MailOpen, Mail, ShieldOff } from 'lucide-react';
import type { EmailThread } from '@shared/types';
import { formatThreadDate } from '@/lib/date-utils';
import { useMailContext } from '@/contexts/MailContext';
import { AccountChip } from './AccountChip';

interface ThreadListProps {
  threads: EmailThread[];
  loading?: boolean;
  error?: string | null;
  empty?: ReactNode;
  onRetry?: () => void;
  buildThreadPath: (threadId: string) => string;
  showAccountChip?: boolean;
  onToggleStar?: (id: string, starred: boolean) => void;
  onToggleSelect?: (id: string, selected: boolean) => void;
  selectedThreads?: Set<string>;
  selectedThreadId?: string;
  onArchive?: (thread: EmailThread) => void;
  onTrash?: (thread: EmailThread) => void;
  onToggleRead?: (thread: EmailThread) => void;
  onSpam?: (thread: EmailThread) => void;
}

function ThreadListSkeleton() {
  return (
    <div className="flex-1 overflow-hidden">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Skeleton className="h-4 w-4 rounded shrink-0" />
          <Skeleton className="h-4 w-4 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
          <Skeleton className="h-3 w-10 shrink-0" />
        </div>
      ))}
    </div>
  );
}

interface HoverActionProps {
  label: string;
  icon: typeof Archive;
  destructive?: boolean;
  onClick: () => void;
}

function HoverAction({ label, icon: Icon, destructive, onClick }: HoverActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', destructive && 'hover:text-destructive')}
          aria-label={label}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
          }}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function ThreadList({
  threads,
  loading,
  error,
  empty,
  onRetry,
  buildThreadPath,
  showAccountChip,
  onToggleStar,
  onToggleSelect,
  selectedThreads,
  selectedThreadId,
  onArchive,
  onTrash,
  onToggleRead,
  onSpam,
}: ThreadListProps) {
  const { addresses } = useMailContext();

  if (loading) {
    return <ThreadListSkeleton />;
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div>{error}</div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (threads.length === 0) {
    return <>{empty}</>;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex-1 overflow-auto">
        {threads.map((thread) => {
          const hasHoverActions = Boolean(onArchive || onTrash || onToggleRead || onSpam);
          return (
            <Link
              key={thread.id}
              to={buildThreadPath(thread.id)}
              className={cn(
                'group relative flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors',
                !thread.read && 'bg-primary/5',
                selectedThreadId === thread.id && 'bg-muted'
              )}
            >
              {!thread.read && (
                <span className="absolute left-0 inset-y-0 w-0.5 bg-primary" aria-hidden />
              )}

              <Checkbox
                className="shrink-0"
                checked={selectedThreads?.has(thread.id) ?? false}
                onClick={(e) => e.stopPropagation()}
                onCheckedChange={(checked) => {
                  onToggleSelect?.(thread.id, checked === true);
                }}
              />

              <button
                className={cn(
                  'shrink-0 p-1 rounded hover:bg-muted',
                  thread.starred ? 'text-yellow-500' : 'text-muted-foreground'
                )}
                aria-label={thread.starred ? 'Unstar' : 'Star'}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleStar?.(thread.id, !thread.starred);
                }}
              >
                <Star className="h-4 w-4" fill={thread.starred ? 'currentColor' : 'none'} />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'truncate',
                    !thread.read ? 'font-semibold text-foreground' : 'font-medium'
                  )}>
                    {thread.participants.length > 1
                      ? `${thread.participants[0].split('@')[0]} +${thread.participants.length - 1}`
                      : thread.participants[0]?.split('@')[0] || 'Unknown'
                    }
                  </span>
                  {thread.emailCount > 1 && (
                    <span className="text-xs text-muted-foreground">({thread.emailCount})</span>
                  )}
                  {showAccountChip && (
                    <AccountChip account={thread.account} addresses={addresses} />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'truncate',
                    !thread.read ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {thread.subject}
                  </span>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-muted-foreground truncate text-sm">
                    {thread.snippet}
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  'shrink-0 text-xs text-muted-foreground transition-opacity',
                  hasHoverActions && 'group-hover:opacity-0'
                )}
              >
                {formatThreadDate(thread.lastEmailAt)}
              </div>

              {hasHoverActions && (
                <div className="absolute right-2 inset-y-0 hidden group-hover:flex items-center gap-0.5 pl-8 bg-gradient-to-l from-background via-background to-transparent">
                  {onToggleRead && (
                    <HoverAction
                      label={thread.read ? 'Mark unread' : 'Mark read'}
                      icon={thread.read ? Mail : MailOpen}
                      onClick={() => onToggleRead(thread)}
                    />
                  )}
                  {onArchive && (
                    <HoverAction label="Archive" icon={Archive} onClick={() => onArchive(thread)} />
                  )}
                  {onSpam && (
                    <HoverAction
                      label="Spam & block sender"
                      icon={ShieldOff}
                      destructive
                      onClick={() => onSpam(thread)}
                    />
                  )}
                  {onTrash && (
                    <HoverAction label="Trash" icon={Trash2} destructive onClick={() => onTrash(thread)} />
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
