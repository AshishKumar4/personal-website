/**
 * Convert a Jupyter notebook (.ipynb, nbformat 4) into Markdown.
 *
 * Markdown cells pass through. Code cells become fenced blocks tagged with the
 * notebook language. Outputs (stream text, text/plain results, and images) are
 * rendered inline. Images are returned separately as data URIs so the caller can
 * upload them and rewrite the placeholders to hosted URLs.
 */

export interface NotebookImage {
  /** Stable placeholder emitted in the markdown, e.g. nb-image-0 */
  placeholder: string;
  /** data: URI, e.g. data:image/png;base64,... */
  dataUri: string;
  /** file extension without dot, derived from the mime type */
  ext: string;
}

export interface NotebookConversion {
  markdown: string;
  images: NotebookImage[];
  /** "Open in Colab" URL, if the notebook carried a Colab badge. */
  colabUrl?: string;
}

const COLAB_URL_RE = /https?:\/\/colab\.research\.google\.com\/[^\s")'>]+/;

interface RawCell {
  cell_type: string;
  source: string | string[];
  outputs?: RawOutput[];
}

interface RawOutput {
  output_type: string;
  text?: string | string[];
  data?: Record<string, string | string[]>;
  name?: string;
}

interface RawNotebook {
  cells?: RawCell[];
  metadata?: { kernelspec?: { language?: string }; language_info?: { name?: string } };
}

function joinSource(src: string | string[] | undefined): string {
  if (Array.isArray(src)) return src.join('');
  return src ?? '';
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  return map[mime] ?? 'png';
}

function fence(lang: string, code: string): string {
  // Guard against code that itself contains a triple backtick run.
  const ticks = code.includes('```') ? '````' : '```';
  return `${ticks}${lang}\n${code.replace(/\n+$/, '')}\n${ticks}`;
}

export function notebookToMarkdown(notebook: RawNotebook | string): NotebookConversion {
  const nb: RawNotebook = typeof notebook === 'string' ? JSON.parse(notebook) : notebook;
  const lang =
    nb.metadata?.language_info?.name ?? nb.metadata?.kernelspec?.language ?? 'python';

  const images: NotebookImage[] = [];
  const blocks: string[] = [];
  let colabUrl: string | undefined;

  const pushImage = (mime: string, b64: string): string => {
    const clean = (Array.isArray(b64) ? b64.join('') : b64).replace(/\s+/g, '');
    const ext = mimeToExt(mime);
    const placeholder = `nb-image-${images.length}`;
    images.push({ placeholder, dataUri: `data:${mime};base64,${clean}`, ext });
    return `![output](${placeholder})`;
  };

  for (const cell of nb.cells ?? []) {
    if (cell.cell_type === 'markdown') {
      let md = joinSource(cell.source).trim();
      // Pull out the Colab badge: capture its URL, then drop the badge markup
      // (an <a> wrapping a colab-badge <img>) so it doesn't render as a broken image.
      if (!colabUrl) {
        const found = md.match(COLAB_URL_RE);
        if (found) colabUrl = found[0];
      }
      md = md
        .replace(/<a[^>]*colab\.research\.google\.com[\s\S]*?<\/a>/gi, '')
        .replace(/\[!\[[^\]]*\]\([^)]*colab[^)]*\)\]\([^)]*\)/gi, '')
        .trim();
      if (md) blocks.push(md);
      continue;
    }

    if (cell.cell_type === 'code') {
      const code = joinSource(cell.source).trim();
      if (code) blocks.push(fence(lang, code));

      const outParts: string[] = [];
      for (const out of cell.outputs ?? []) {
        if (out.output_type === 'stream') {
          const text = joinSource(out.text).replace(/\n+$/, '');
          if (text.trim()) outParts.push(fence('text', text));
        } else if (out.output_type === 'execute_result' || out.output_type === 'display_data') {
          const data = out.data ?? {};
          const imageMime = Object.keys(data).find((k) => k.startsWith('image/'));
          if (imageMime) {
            outParts.push(pushImage(imageMime, data[imageMime] as string));
          } else if (data['text/markdown']) {
            outParts.push(joinSource(data['text/markdown']).trim());
          } else if (data['text/plain']) {
            const text = joinSource(data['text/plain']).replace(/\n+$/, '');
            if (text.trim()) outParts.push(fence('text', text));
          }
        }
        // error/other output types are intentionally dropped
      }
      if (outParts.length) blocks.push(outParts.join('\n\n'));
      continue;
    }
    // raw / unknown cell types are dropped
  }

  return { markdown: blocks.join('\n\n') + '\n', images, colabUrl };
}
