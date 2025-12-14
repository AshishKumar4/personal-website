import { Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AttachmentFile } from '@shared/types';

interface AttachmentListProps {
  attachments: AttachmentFile[];
  onRemove: (id: string) => void;
  maxWidth?: string;
}

export function AttachmentList({
  attachments,
  onRemove,
  maxWidth = '150px',
}: AttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm"
        >
          <Paperclip className="h-3 w-3 flex-shrink-0" />
          <span className="truncate" style={{ maxWidth }}>
            {attachment.file.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 flex-shrink-0"
            onClick={() => onRemove(attachment.id)}
            aria-label={`Remove ${attachment.file.name}`}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
