import type { BlogPost, NotebookDoc } from './types';

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

const IMAGE_PATTERN = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)|<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
const SKIP_IMAGE = /shields\.io|badge|colab\.research\.google\.com\/assets/i;

function usableImage(url: string | undefined): string | null {
  const u = url?.trim();
  if (!u || u.length > 2048) return null;
  if (!/^(https?:\/\/|\/(?!\/))/i.test(u)) return null;
  if (SKIP_IMAGE.test(u)) return null;
  return u;
}

export function firstMarkdownImage(md: string): string | null {
  const text = md.replace(/```[\s\S]*?```/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  for (const m of text.matchAll(IMAGE_PATTERN)) {
    const hit = usableImage(m[1] ?? m[2] ?? m[3] ?? m[4]);
    if (hit) return hit;
  }
  return null;
}

export function postCoverImage(post: BlogPost): string | null {
  const explicit = usableImage(post.coverImage);
  if (explicit) return explicit;
  if (post.format !== 'notebook') return firstMarkdownImage(post.content);
  let doc: NotebookDoc;
  try {
    doc = JSON.parse(post.content) as NotebookDoc;
  } catch {
    return null;
  }
  for (const cell of doc.cells ?? []) {
    if (cell.kind === 'markdown') {
      const hit = firstMarkdownImage(cell.source);
      if (hit) return hit;
      continue;
    }
    for (const out of cell.outputs ?? []) {
      const hit =
        out.kind === 'image' ? usableImage(out.url)
        : out.kind === 'html' ? firstMarkdownImage(out.html)
        : out.kind === 'markdown' ? firstMarkdownImage(out.source)
        : null;
      if (hit) return hit;
    }
  }
  return null;
}
