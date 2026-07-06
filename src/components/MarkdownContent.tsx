import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

interface MarkdownContentProps {
  children: string;
  className?: string;
}

/** Single markdown rendering pipeline for blog posts, the /about page, and the editor preview. */
export function MarkdownContent({ children, className }: MarkdownContentProps) {
  return (
    <div className={`prose-styles max-w-none ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex, [rehypeHighlight, { detect: false, ignoreMissing: true }]]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
