import { useMemo } from 'react';
import type { NotebookDoc, NotebookCell, NotebookOutput } from '@shared/types';
import { MarkdownContent } from '@/components/MarkdownContent';
import { CodeBlock } from '@/components/CodeBlock';

/** Renders a normalized Jupyter notebook as a sequence of cells, nbviewer-style. */
export function NotebookRenderer({ doc }: { doc: NotebookDoc }) {
  return (
    <div className="notebook space-y-4">
      {doc.cells.map((cell, i) => (
        <Cell key={i} cell={cell} />
      ))}
    </div>
  );
}

function Cell({ cell }: { cell: NotebookCell }) {
  if (cell.kind === 'markdown') {
    return <MarkdownContent>{cell.source}</MarkdownContent>;
  }
  const label = cell.executionCount == null ? '[ ]' : `[${cell.executionCount}]`;
  return (
    <div className="nb-code-cell">
      <div className="flex gap-2 sm:gap-3">
        <span className="hidden sm:block select-none pt-4 font-mono text-xs text-primary/70 w-12 shrink-0 text-right">
          In {label}
        </span>
        <div className="min-w-0 flex-1">
          <CodeBlock code={cell.source} lang={cell.lang} />
        </div>
      </div>
      {cell.outputs.length > 0 && (
        <div className="flex gap-2 sm:gap-3 mt-1">
          <span className="hidden sm:block select-none pt-2 font-mono text-xs text-muted-foreground w-12 shrink-0 text-right">
            Out
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            {cell.outputs.map((out, i) => (
              <Output key={i} out={out} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Output({ out }: { out: NotebookOutput }) {
  switch (out.kind) {
    case 'image':
      return <img src={out.url} alt={out.alt} className="nb-out-img" />;
    case 'html':
      return <div className="nb-html-output overflow-x-auto text-sm" dangerouslySetInnerHTML={{ __html: out.html }} />;
    case 'markdown':
      return <MarkdownContent>{out.source}</MarkdownContent>;
    case 'stream':
    case 'text':
      return (
        <pre className="nb-output-text overflow-x-auto rounded-lg px-4 py-3 text-xs sm:text-sm whitespace-pre-wrap">
          {out.text}
        </pre>
      );
  }
}

/** Parse the stored JSON once and render, with a defensive fallback. */
export function NotebookFromJson({ json }: { json: string }) {
  const doc = useMemo<NotebookDoc | null>(() => {
    try {
      return JSON.parse(json) as NotebookDoc;
    } catch {
      return null;
    }
  }, [json]);

  if (!doc || !Array.isArray(doc.cells)) {
    return <p className="text-muted-foreground">This notebook could not be rendered.</p>;
  }
  return <NotebookRenderer doc={doc} />;
}
