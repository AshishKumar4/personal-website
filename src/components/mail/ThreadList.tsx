import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Star, AlertCircle, RefreshCw } from 'lucide-react';
import type { EmailThread } from '@shared/types';
import { formatThreadDate } from '@/lib/date-utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ThreadListProps {
  threads: EmailThread[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onToggleStar?: (id: string, starred: boolean) => void;
  onToggleSelect?: (id: string, selected: boolean) => void;
  selectedThreads?: Set<string>;
  selectedThreadId?: string;
}

export function ThreadList({
  threads,
  loading,
  error,
  onRetry,
  onToggleStar,
  onToggleSelect,
  selectedThreads,
  selectedThreadId,
}: ThreadListProps) {
  const { label = 'inbox' } = useParams();

  if (loading) {
    return <LoadingSpinner />;
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
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <div className="text-4xl mb-2">📭</div>
        <div>No emails in {label}</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {threads.map((thread) => (
        <Link
          key={thread.id}
          to={`/mail/${label}/${thread.id}`}
          className={cn(
            'flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors',
            !thread.read && 'bg-primary/5',
            selectedThreadId === thread.id && 'bg-muted'
          )}
        >
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
                'font-medium truncate',
                !thread.read && 'font-semibold'
              )}>
                {thread.participants.length > 1
                  ? `${thread.participants[0].split('@')[0]} +${thread.participants.length - 1}`
                  : thread.participants[0]?.split('@')[0] || 'Unknown'
                }
              </span>
              {thread.emailCount > 1 && (
                <span className="text-xs text-muted-foreground">({thread.emailCount})</span>
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

          <div className="shrink-0 text-xs text-muted-foreground">
            {formatThreadDate(thread.lastEmailAt)}
          </div>
        </Link>
      ))}
    </div>
  );
}
