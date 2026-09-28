import { MarkdownContent } from '@/components/MarkdownContent';

export function CodeBlock({ code, lang, label, collapseAfter }: { code: string; lang: string; label?: string; collapseAfter?: number }) {
  const fence = code.includes('```') ? '````' : '```';
  return (
    <MarkdownContent className="nb-code" code={{ label, collapseAfter }}>
      {`${fence}${lang}\n${code}\n${fence}`}
    </MarkdownContent>
  );
}
