import { useRef, useCallback, type RefObject } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface EditorContentProps {
  content: string;
  onContentChange: (markdown: string) => void;
  onImageUpload?: () => void;
  textAreaRef?: RefObject<HTMLTextAreaElement> | null;
}

export function EditorContent({
  content,
  onContentChange,
  onImageUpload,
  textAreaRef,
}: EditorContentProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = textAreaRef ?? internalRef;

  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items;
    if (!items || !onImageUpload) return;

    const hasImage = Array.from(items).some((item) => item.type.startsWith('image/'));
    if (!hasImage) return;

    event.preventDefault();
    onImageUpload();
  }, [onImageUpload]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLTextAreaElement>) => {
    const files = event.dataTransfer?.files;
    if (!files || !onImageUpload) return;

    const hasImage = Array.from(files).some((file) => file.type.startsWith('image/'));
    if (!hasImage) return;

    event.preventDefault();
    onImageUpload();
  }, [onImageUpload]);

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="flex items-center gap-0.5 p-2 border-b border-border bg-card flex-wrap">
        <p className="text-xs text-muted-foreground px-2 py-1">
          Paste markdown directly and edit raw source.
        </p>
      </div>
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
          placeholder="Start writing your blog post in markdown..."
          className="h-full min-h-[70vh] resize-none font-mono text-sm leading-relaxed whitespace-pre-wrap"
          style={{ minHeight: '100%' }}
        />
      </div>
    </div>
  );
}
