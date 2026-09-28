import { memo, useId, useMemo, useState } from 'react';
import type { NotebookDoc, NotebookCell, NotebookOutput } from '@shared/types';
import { MarkdownContent } from '@/components/MarkdownContent';
import { CodeBlock } from '@/components/CodeBlock';
import { Figure } from '@/components/reading/Figure';
import { languageName } from '@/components/reading/post-text';
import { cn } from '@/lib/utils';

const OUTPUT_LINES = 12;
const CODE_LINES = 24;

export const NotebookRenderer = memo(function NotebookRenderer({ doc, anchors = false }: { doc: NotebookDoc; anchors?: boolean }) {
  return (
    <div className="notebook">
      {doc.cells.map((cell, i) => (
        <Cell key={i} cell={cell} anchors={anchors} />
      ))}
    </div>
  );
});

function Cell({ cell, anchors }: { cell: NotebookCell; anchors: boolean }) {
  if (cell.kind === 'markdown') {
    return <MarkdownContent className="nb-md" anchors={anchors}>{cell.source}</MarkdownContent>;
  }
  if (!cell.source.trim() && cell.outputs.length === 0) return null;
  const outputs = cell.outputs.filter(o => o.kind !== 'stream' || o.text.trim());
  return (
    <div className={cn('nb-cell', outputs.length > 0 && 'has-output')}>
      <CodeBlock code={cell.source} lang={cell.lang} label={languageName(cell.lang) ?? 'Code'} collapseAfter={CODE_LINES} />
      {outputs.length > 0 && (
        <div className="nb-outputs">
          <div className="nb-outputs-label">Output</div>
          {outputs.map((out, i) => (
            <Output key={i} out={out} />
          ))}
        </div>
      )}
    </div>
  );
}

function OutputText({ text }: { text: string }) {
  const clean = text.replace(/\s+$/, '');
  const lines = clean.split('\n').length;
  const long = lines > OUTPUT_LINES + 4;
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={cn('nb-output-text', long && !open && 'is-collapsed')}>
      <pre id={id}>{clean}</pre>
      {long && (
        <button type="button" className="code-frame-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>
          {open ? 'Show less' : `Show all ${lines} lines`}
        </button>
      )}
    </div>
  );
}

function Output({ out }: { out: NotebookOutput }) {
  switch (out.kind) {
    case 'image':
      return <Figure src={out.url} alt={out.alt} className="nb-figure" />;
    case 'html':
      return <div className="nb-html-output" dangerouslySetInnerHTML={{ __html: out.html }} />;
    case 'markdown':
      return <MarkdownContent className="nb-md-output">{out.source}</MarkdownContent>;
    case 'stream':
    case 'text':
      return <OutputText text={out.text} />;
  }
}

export function NotebookFromJson({ json, anchors }: { json: string; anchors?: boolean }) {
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
  return <NotebookRenderer doc={doc} anchors={anchors} />;
}
