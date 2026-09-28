import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { languageName } from './post-text';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button type="button" onClick={copy} className="code-frame-btn" aria-label={copied ? 'Copied' : 'Copy code'}>
      {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

export function CodeFrame({
  lang,
  text,
  label,
  collapseAfter,
  children,
}: {
  lang?: string | null;
  text: string;
  label?: string;
  collapseAfter?: number;
  children: ReactNode;
}) {
  const lines = text.replace(/\n$/, '').split('\n').length;
  const collapsible = !!collapseAfter && lines > collapseAfter + 6;
  const [open, setOpen] = useState(!collapsible);
  const id = useId();
  const name = label ?? languageName(lang);
  return (
    <div className={cn('code-frame', collapsible && !open && 'is-collapsed')} style={collapsible ? ({ '--collapse-lines': collapseAfter } as CSSProperties) : undefined}>
      <div className="code-frame-bar">
        <span className="code-frame-lang">{name ?? ''}</span>
        <span className="flex items-center gap-1">
          {collapsible && <span className="code-frame-count">{lines} lines</span>}
          <CopyButton text={text.replace(/\n$/, '')} />
        </span>
      </div>
      <div id={id} className="code-frame-body">
        {children}
      </div>
      {collapsible && (
        <button type="button" className="code-frame-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(o => !o)}>
          {open ? 'Show less' : `Show all ${lines} lines`}
        </button>
      )}
    </div>
  );
}
