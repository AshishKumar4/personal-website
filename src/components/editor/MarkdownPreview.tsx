import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
        <div className="prose-styles max-w-none">
          {content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">
              Start writing to see a preview...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
