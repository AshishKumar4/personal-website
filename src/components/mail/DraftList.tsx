import { File, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatThreadDate } from '@/lib/date-utils';
import type { EmailDraft } from '@shared/types';

interface DraftListProps {
  drafts: EmailDraft[];
  onOpen: (draft: EmailDraft) => void;
  onDelete: (draft: EmailDraft) => void;
}

export function DraftList({ drafts, onOpen, onDelete }: DraftListProps) {
  if (drafts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <File className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm">No drafts</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {drafts.map((draft) => (
        <div
          key={draft.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(draft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpen(draft);
            }
          }}
          className="group relative w-full text-left flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
        >
          <span className="text-xs font-medium text-destructive shrink-0">Draft</span>
          <div className="flex-1 min-w-0">
            <div className={cn('truncate text-sm', !draft.to && 'text-muted-foreground italic')}>
              {draft.to || '(no recipients)'}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className={cn('truncate', !draft.subject && 'text-muted-foreground italic')}>
                {draft.subject || '(no subject)'}
              </span>
              {draft.body && (
                <>
                  <span className="text-muted-foreground">-</span>
                  <span className="text-muted-foreground truncate">{draft.body}</span>
                </>
              )}
            </div>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground group-hover:opacity-0 transition-opacity">
            {formatThreadDate(draft.updatedAt)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            aria-label="Delete draft"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(draft);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
