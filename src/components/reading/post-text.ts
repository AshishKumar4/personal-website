import type { NotebookDoc, PostSummary } from '@shared/types';

const HEADING_WORDS = /^(Overview|Introduction|Abstract|Summary|Background|TL;DR|Preface)\s+(?=[A-Z0-9"'“])/;

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function stripTitle(title: string, text: string): string {
  const t = text.trim();
  const head = t.slice(0, title.length);
  if (normalize(head) === normalize(title)) return t.slice(title.length).trim();
  return t;
}

export function firstSentences(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  const parts = clean.match(/[^.!?…]+[.!?]+(?=\s|$)/g);
  if (!parts) return clean;
  let out = '';
  for (const p of parts) {
    const next = (out + ' ' + p.trim()).trim();
    if (out && next.length > max) break;
    out = next;
    if (out.length > max * 0.6) break;
  }
  return out || clean;
}

export function cleanExcerpt(post: Pick<PostSummary, 'title' | 'excerpt'>, max = 200): string {
  const body = stripTitle(post.title, post.excerpt ?? '').replace(HEADING_WORDS, '');
  return firstSentences(body, max);
}

export function postMinutes(post: Pick<PostSummary, 'readingTime'> | undefined, fallback: number) {
  return post?.readingTime && post.readingTime > 0 ? post.readingTime : fallback;
}

const PLAIN_LEAD = /^(?![#!|>`$<]|[-*+]\s|\d+[.)]\s)[^\n]/;

export function splitLead(markdown: string, limit = 440): { lead: string | null; rest: string } {
  const src = markdown.replace(/^\s+/, '');
  const end = src.search(/\n\s*\n/);
  const block = (end === -1 ? src : src.slice(0, end)).trim();
  if (!block || !PLAIN_LEAD.test(block) || block.length > limit || /\]\(|`|\$|<|\n\s*([#>|`]|[-*+]\s|\d+[.)]\s)/.test(block)) {
    return { lead: null, rest: markdown };
  }
  const lead = block.replace(/\*\*|__/g, '').replace(/(^|\s)[*_]([^*_]+)[*_](?=\s|[.,;:!?]|$)/g, '$1$2').replace(/\s+/g, ' ');
  return { lead, rest: end === -1 ? '' : src.slice(end).replace(/^\s+/, '') };
}

function stripFences(src: string) {
  let inFence = false;
  return src.split('\n').filter(line => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return false;
    }
    return !inFence;
  });
}

function promoteHeadings(src: string) {
  let inFence = false;
  return src
    .split('\n')
    .map(line => {
      if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
      if (inFence) return line;
      return line.replace(/^(#{2,6})(\s)/, (_, h: string, sp: string) => h.slice(1) + sp);
    })
    .join('\n');
}

export function prepareNotebook(json: string, title: string): { doc: NotebookDoc | null; lead: string | null; words: number } {
  let doc: NotebookDoc;
  try {
    doc = JSON.parse(json) as NotebookDoc;
  } catch {
    return { doc: null, lead: null, words: 0 };
  }
  if (!Array.isArray(doc.cells)) return { doc: null, lead: null, words: 0 };
  const cells = doc.cells.slice();
  let lead: string | null = null;
  const firstIdx = cells.findIndex(c => c.kind === 'markdown');
  if (firstIdx === 0 && cells[0].kind === 'markdown') {
    let src = cells[0].source;
    const m = src.match(/^\s*#\s+(.+)\n?/);
    if (m && normalize(m[1]) === normalize(title)) src = src.slice(m[0].length);
    const split = splitLead(src);
    lead = split.lead;
    src = split.rest;
    cells[0] = { kind: 'markdown', source: src };
    if (!src.trim()) cells.shift();
  }
  const hasH1 = (src: string) => stripFences(src).some(l => /^#\s/.test(l));
  const firstH1 = cells.findIndex(c => c.kind === 'markdown' && hasH1(c.source));
  if (firstH1 > 0) {
    for (let i = 0; i < firstH1; i++) {
      const c = cells[i];
      if (c.kind === 'markdown') cells[i] = { kind: 'markdown', source: promoteHeadings(c.source) };
    }
  }
  const words = cells.reduce((n, c) => n + c.source.trim().split(/\s+/).length, 0);
  return { doc: { ...doc, cells }, lead, words };
}

export function formatDate(ms: number, style: 'long' | 'short' = 'long') {
  return new Date(ms).toLocaleDateString('en-US', style === 'long' ? { year: 'numeric', month: 'long', day: 'numeric' } : { year: 'numeric', month: 'short' });
}

const LANG_NAMES: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  jsx: 'JSX',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  tsx: 'TSX',
  py: 'Python',
  python: 'Python',
  sh: 'Shell',
  bash: 'Bash',
  shell: 'Shell',
  zsh: 'Shell',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  go: 'Go',
  rust: 'Rust',
  rs: 'Rust',
  c: 'C',
  cpp: 'C++',
  'c++': 'C++',
  html: 'HTML',
  css: 'CSS',
  sql: 'SQL',
  http: 'HTTP',
  diff: 'Diff',
  toml: 'TOML',
  text: 'Text',
  plaintext: 'Text',
  txt: 'Text',
};

export function languageName(lang?: string | null) {
  if (!lang) return null;
  const key = lang.toLowerCase();
  return LANG_NAMES[key] ?? (key.length <= 4 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1));
}

const GENERIC_ALT = /^(output|image|img|figure|fig|png|jpe?g|screenshot|picture|photo|diagram|untitled)?\s*\d*$/i;

export function captionFrom(alt?: string | null) {
  const a = (alt ?? '').trim();
  if (!a || GENERIC_ALT.test(a) || /\.(png|jpe?g|gif|webp|svg)$/i.test(a)) return null;
  return a;
}
