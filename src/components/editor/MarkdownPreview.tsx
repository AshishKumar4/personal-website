import { MarkdownContent } from '@/components/MarkdownContent';

interface MarkdownPreviewProps {
  content: string;
  title?: string;
}

export function MarkdownPreview({ content, title }: MarkdownPreviewProps) {
  return (
    <div className="h-full overflow-auto bg-background">
      <div className="max-w-3xl mx-auto p-6 md:p-10">
        {title && (
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground font-display mb-8">
            {title}
          </h1>
        )}
        {content ? (
          <MarkdownContent>{content}</MarkdownContent>
        ) : (
          <p className="text-muted-foreground italic">
            Start writing to see a preview...
          </p>
        )}
      </div>
    </div>
  );
}
