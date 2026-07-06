import { MarkdownContent } from '@/components/MarkdownContent';

/**
 * A standalone syntax-highlighted code block, rendered through the shared
 * markdown pipeline so highlighting stays consistent with prose code fences.
 */
export function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const fence = code.includes('```') ? '````' : '```';
  return <MarkdownContent className="nb-code">{`${fence}${lang}\n${code}\n${fence}`}</MarkdownContent>;
}
