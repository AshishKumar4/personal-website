/**
 * Parse a Jupyter notebook (.ipynb, nbformat 4) into a normalized NotebookDoc
 * for faithful rendering (cells + outputs), plus the list of output images to
 * upload. Image outputs carry a placeholder URL that the caller swaps for a
 * hosted URL after upload.
 */
import type { NotebookDoc, NotebookCell, NotebookOutput } from '@shared/types';

export interface NotebookImage {
  placeholder: string;
  dataUri: string;
  ext: string;
}

export interface ParsedNotebook {
  notebook: NotebookDoc;
  images: NotebookImage[];
}

interface RawOutput {
  output_type: string;
  text?: string | string[];
  data?: Record<string, string | string[]>;
  name?: string;
  execution_count?: number | null;
}
interface RawCell {
  cell_type: string;
  source: string | string[];
  outputs?: RawOutput[];
  execution_count?: number | null;
}
interface RawNotebook {
  cells?: RawCell[];
  metadata?: { kernelspec?: { language?: string }; language_info?: { name?: string } };
}

const COLAB_URL_RE = /https?:\/\/colab\.research\.google\.com\/[^\s")'>]+/;

const s = (v: string | string[] | undefined): string => (Array.isArray(v) ? v.join('') : v ?? '');

// Strip ANSI terminal escape codes (colors, cursor moves) that pollute stream output.
const stripAnsi = (t: string): string =>
  t.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '').replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g, '');

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg',
    'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg',
  };
  return map[mime] ?? 'png';
}

function stripColabBadge(md: string): string {
  return md
    .replace(/<a[^>]*colab\.research\.google\.com[\s\S]*?<\/a>/gi, '')
    .replace(/\[!\[[^\]]*\]\([^)]*colab[^)]*\)\]\([^)]*\)/gi, '')
    .trim();
}

/** From a Colab URL, derive the raw.githubusercontent base + the notebook's directory. */
function githubBase(colabUrl: string | undefined): { rawBase: string; dir: string } | null {
  if (!colabUrl) return null;
  const m = colabUrl.match(/github\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
  if (!m) return null;
  const [, owner, repo, branch, path] = m;
  const decoded = decodeURIComponent(path);
  const dir = decoded.includes('/') ? decoded.slice(0, decoded.lastIndexOf('/')) : '';
  return { rawBase: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`, dir };
}

function resolvePath(dir: string, rel: string): string {
  const parts = (dir ? dir.split('/') : []).concat(rel.split('/'));
  const out: string[] = [];
  for (const p of parts) {
    if (p === '' || p === '.') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  return out.join('/');
}

/** Rewrite repo-relative image references in a markdown cell to absolute raw-GitHub URLs. */
function absolutizeImages(md: string, gh: { rawBase: string; dir: string }): string {
  const isRelative = (src: string) => !/^(https?:|data:|\/)/i.test(src);
  const toAbs = (src: string) => (isRelative(src) ? gh.rawBase + encodeURI(resolvePath(gh.dir, src)) : src);
  return md
    .replace(/(!\[[^\]]*\]\()([^)\s]+)(\))/g, (_m, a, src, b) => a + toAbs(src) + b)
    .replace(/(<img[^>]*\bsrc=["'])([^"']+)(["'])/gi, (_m, a, src, b) => a + toAbs(src) + b);
}

export function parseNotebook(input: RawNotebook | string): ParsedNotebook {
  const nb: RawNotebook = typeof input === 'string' ? JSON.parse(input) : input;
  const lang = nb.metadata?.language_info?.name ?? nb.metadata?.kernelspec?.language ?? 'python';

  const images: NotebookImage[] = [];
  const cells: NotebookCell[] = [];
  let colabUrl: string | undefined;

  const pushImage = (mime: string, b64: string | string[]): string => {
    const clean = s(b64).replace(/\s+/g, '');
    const placeholder = `nb-image-${images.length}`;
    images.push({ placeholder, dataUri: `data:${mime};base64,${clean}`, ext: mimeToExt(mime) });
    return placeholder;
  };

  for (const cell of nb.cells ?? []) {
    if (cell.cell_type === 'markdown') {
      let md = s(cell.source).trim();
      if (!colabUrl) {
        const found = md.match(COLAB_URL_RE);
        if (found) colabUrl = found[0];
      }
      md = stripColabBadge(md);
      if (md) cells.push({ kind: 'markdown', source: md });
      continue;
    }

    if (cell.cell_type === 'code') {
      const source = s(cell.source).replace(/\n+$/, '');
      const outputs: NotebookOutput[] = [];
      for (const out of cell.outputs ?? []) {
        if (out.output_type === 'stream') {
          const text = stripAnsi(s(out.text)).replace(/\n+$/, '');
          if (!text) continue;
          // Merge consecutive stream chunks (e.g. tqdm + per-epoch prints) into
          // one block so a long training log is a single scrollable output.
          const last = outputs[outputs.length - 1];
          if (last && last.kind === 'stream') last.text += '\n' + text;
          else outputs.push({ kind: 'stream', text });
        } else if (out.output_type === 'execute_result' || out.output_type === 'display_data') {
          const data = out.data ?? {};
          const imageMime = Object.keys(data).find((k) => k.startsWith('image/'));
          if (imageMime) {
            outputs.push({ kind: 'image', url: pushImage(imageMime, data[imageMime]), alt: 'output' });
          } else if (data['text/html']) {
            outputs.push({ kind: 'html', html: s(data['text/html']) });
          } else if (data['text/markdown']) {
            outputs.push({ kind: 'markdown', source: s(data['text/markdown']).trim() });
          } else if (data['text/plain']) {
            const text = stripAnsi(s(data['text/plain'])).replace(/\n+$/, '');
            if (text) outputs.push({ kind: 'text', text });
          }
        }
        // error/other output types are dropped
      }
      // Skip fully empty code cells (no source, no output)
      if (source || outputs.length) {
        cells.push({ kind: 'code', source, lang, executionCount: cell.execution_count ?? null, outputs });
      }
      continue;
    }
    // raw / unknown cell types are dropped
  }

  // Once the repo is known (from the Colab badge), resolve repo-relative image
  // references in markdown cells to absolute raw-GitHub URLs so they load.
  const gh = githubBase(colabUrl);
  if (gh) {
    for (const cell of cells) {
      if (cell.kind === 'markdown') cell.source = absolutizeImages(cell.source, gh);
    }
  }

  return { notebook: { colabUrl, cells }, images };
}

/** First markdown H1 in the notebook, used as a default post title. */
export function notebookTitle(doc: NotebookDoc): string | undefined {
  for (const cell of doc.cells) {
    if (cell.kind === 'markdown') {
      const h1 = cell.source.match(/^#\s+(.+)$/m);
      if (h1) return h1[1].trim();
    }
  }
  return undefined;
}
