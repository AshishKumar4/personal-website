import TurndownService from 'turndown';
import { marked } from 'marked';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

turndownService.addRule('codeBlock', {
  filter: (node) => {
    return (
      node.nodeName === 'PRE' &&
      node.firstChild !== null &&
      node.firstChild.nodeName === 'CODE'
    );
  },
  replacement: (content, node) => {
    const codeNode = node.firstChild as HTMLElement;
    const language = codeNode.className?.replace('language-', '') || '';
    const code = codeNode.textContent || '';
    return `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
  },
});

turndownService.addRule('inlineCode', {
  filter: (node) => {
    return node.nodeName === 'CODE' && node.parentNode?.nodeName !== 'PRE';
  },
  replacement: (content) => {
    return `\`${content}\``;
  },
});

export function htmlToMarkdown(html: string): string {
  if (!html || html === '<p></p>') return '';
  return turndownService.turndown(html);
}

export function markdownToHtml(markdown: string): string {
  if (!markdown) return '<p></p>';
  const output = marked.parse(markdown);
  return typeof output === 'string' ? output : '<p></p>';
}

export function looksLikeMarkdown(text: string): boolean {
  const value = text.trim();
  if (!value) return false;

  const patterns: RegExp[] = [
    /^#{1,6}\s+/m,
    /^```/m,
    /^>\s+/m,
    /\[[^\]]+\]\([^)]+\)/,
    /!\[[^\]]*\]\([^)]+\)/,
    /^\s*[-*+]\s+\[[ xX]\]\s+/m,
    /^\s*[-*+]\s+/m,
    /^\s*\d+\.\s+/m,
    /^```[a-zA-Z0-9_-]+\n/m,
    /^\|.*\|\s*$/m,
  ];

  let matchCount = 0;
  for (const pattern of patterns) {
    if (pattern.test(value)) {
      matchCount += 1;
    }
  }

  return matchCount >= 2 || (matchCount === 1 && (/`{3,}/.test(value) || value.includes('|') && value.includes('\n')));
}
