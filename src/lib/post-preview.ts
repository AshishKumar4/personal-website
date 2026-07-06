import type { BlogPost, NotebookDoc } from '@shared/types';

/** Strip markdown/HTML to readable plain text for excerpts. */
export function markdownToPlain(md: string): string {
  return md
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[*_~>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Readable plain-text body for a post, regardless of format. */
export function postPlainText(post: BlogPost): string {
  if (post.format === 'notebook') {
    try {
      const doc = JSON.parse(post.content) as NotebookDoc;
      const md = doc.cells
        .filter((c) => c.kind === 'markdown')
        .map((c) => (c as { source: string }).source)
        .join('\n\n');
      return markdownToPlain(md);
    } catch {
      return '';
    }
  }
  return markdownToPlain(post.content);
}

export function postExcerpt(post: BlogPost, maxLength = 180): string {
  const text = postPlainText(post);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '…';
}

/** Reading time in minutes from a post's readable text. */
export function postReadingTime(post: BlogPost): number {
  const words = postPlainText(post).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
