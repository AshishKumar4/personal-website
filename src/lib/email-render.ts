import DOMPurify from 'dompurify';
import type { Email } from '@shared/types';
import { DOMPURIFY_CONFIG } from './mail-constants';

/**
 * Email → safe iframe HTML pipeline. Owns sanitization, remote-image gating,
 * inline (CID) image resolution, quote collapsing, plain-text rendering, and
 * the sandboxed srcDoc (with a CSP that enforces "no scripts" at the platform
 * level, independent of the iframe sandbox flags). This is the single place
 * email content is turned into something renderable.
 */

const BASE_CSS = `
  html, body {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #1a1a1a;
    background: #ffffff;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  body { padding: 4px; }
  img { max-width: 100%; height: auto; }
  a { color: #1a73e8; }
  table { border-spacing: 0; max-width: 100%; }
  blockquote { border-left: 3px solid #ccc; margin: 8px 0; padding: 4px 12px; color: #555; }
  pre, code { font-family: 'Fira Code', 'Roboto Mono', monospace; }
  pre { white-space: pre-wrap; word-wrap: break-word; }
  details.email-quote { margin: 8px 0; }
  details.email-quote > summary {
    cursor: pointer; color: #5f6368; list-style: none; display: inline-flex;
    align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px;
    background: #f1f3f4; font-size: 12px; user-select: none; margin-bottom: 8px;
  }
  details.email-quote > summary::-webkit-details-marker { display: none; }
`;

const QUOTE_SELECTORS = [
  'blockquote',
  '.gmail_quote',
  '.gmail_quote_container',
  '.yahoo_quoted',
  '.OutlookMessageHeader',
  '#divRplyFwdMsg',
  '[id^="OLK_SRC_BODY"]',
];

// "On <date>, <sender> wrote:" attribution across common locales.
const ATTRIBUTION_RE = /^\s*(On\b.*\bwrote:|Le\b.*\ba écrit\s*:|Am\b.*\bschrieb\b.*:|El\b.*\bescribió:|Il\b.*\bha scritto:|.*于.*写道：|.*<[^>]+>\s*wrote:)\s*$/i;

const LINKIFY_RE = /(https?:\/\/[^\s<>"']+)|([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi;

export interface RenderedEmail {
  html: string;
  blockedImageCount: number;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function textToHtml(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, '<br>');
}

export function htmlToPlainText(html: string): string {
  const prepared = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|blockquote|h[1-6]|tr)>/gi, '$&\n');
  const doc = new DOMParser().parseFromString(prepared, 'text/html');
  return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

function isRemoteUrl(url: string): boolean {
  return /^(https?:)?\/\//i.test(url.trim());
}

function resolveCidValue(value: string, email: Email): string | null {
  const cid = value.replace(/^cid:/i, '').replace(/^<|>$/g, '');
  const attachment = email.attachments.find(
    (a) => a.contentId === cid || a.contentId === `<${cid}>`
  );
  return attachment ? `/api/mail/attachments/${email.id}/${attachment.id}` : null;
}

function transformSrcset(
  srcset: string,
  email: Email,
  allowRemote: boolean,
  onBlocked: () => void
): string | null {
  const parts = srcset.split(',').map((p) => p.trim()).filter(Boolean);
  const kept: string[] = [];
  for (const part of parts) {
    const [url, ...descriptor] = part.split(/\s+/);
    if (/^cid:/i.test(url)) {
      const resolved = resolveCidValue(url, email);
      if (resolved) kept.push([resolved, ...descriptor].join(' '));
    } else if (isRemoteUrl(url)) {
      if (allowRemote) kept.push(part);
      else onBlocked();
    } else {
      kept.push(part);
    }
  }
  return kept.length > 0 ? kept.join(', ') : null;
}

function processImages(doc: Document, email: Email, allowRemote: boolean): number {
  let blocked = 0;
  const markBlocked = () => { blocked++; };

  doc.querySelectorAll('img').forEach((img) => {
    const w = parseInt(img.getAttribute('width') || '', 10);
    const h = parseInt(img.getAttribute('height') || '', 10);
    if (w === 1 && h === 1) { img.remove(); return; }

    const src = img.getAttribute('src') || '';
    if (/^cid:/i.test(src)) {
      const resolved = resolveCidValue(src, email);
      if (resolved) img.setAttribute('src', resolved);
      else img.removeAttribute('src');
    } else if (isRemoteUrl(src)) {
      if (allowRemote) { /* keep */ }
      else { img.removeAttribute('src'); markBlocked(); }
    }

    const srcset = img.getAttribute('srcset');
    if (srcset) {
      const next = transformSrcset(srcset, email, allowRemote, markBlocked);
      if (next) img.setAttribute('srcset', next);
      else img.removeAttribute('srcset');
    }
  });

  if (!allowRemote) {
    doc.querySelectorAll('[style]').forEach((el) => {
      const style = el.getAttribute('style') || '';
      if (/url\(\s*['"]?https?:/i.test(style)) {
        el.setAttribute('style', style.replace(/url\(\s*['"]?https?:[^)]*\)/gi, 'none'));
        markBlocked();
      }
    });
  }

  return blocked;
}

function hardenLinks(doc: Document): void {
  doc.querySelectorAll('a[href]').forEach((a) => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });
}

function findQuoteBoundary(doc: Document): Element | null {
  const structural = doc.body.querySelector(QUOTE_SELECTORS.join(','));
  let attribution: Element | null = null;
  for (const el of Array.from(doc.body.querySelectorAll('div, p'))) {
    if (ATTRIBUTION_RE.test((el.textContent || '').trim())) { attribution = el; break; }
  }
  if (structural && attribution) {
    const attrFirst = structural.compareDocumentPosition(attribution) & Node.DOCUMENT_POSITION_PRECEDING;
    return attrFirst ? attribution : structural;
  }
  return structural || attribution;
}

/**
 * Collapse the quoted history behind a native <details> toggle (no scripts
 * needed). Wraps the boundary element and everything after it *within its own
 * parent*, so new reply text that precedes the quote in the same container is
 * never hidden. Non-destructive: a false positive costs one click.
 */
function collapseQuotes(doc: Document): void {
  const boundary = findQuoteBoundary(doc);
  const parent = boundary?.parentNode;
  if (!boundary || !parent) return;

  const details = doc.createElement('details');
  details.className = 'email-quote';
  const summary = doc.createElement('summary');
  summary.textContent = 'Show quoted text';
  details.appendChild(summary);
  parent.insertBefore(details, boundary);

  let node: ChildNode | null = boundary;
  while (node) {
    const next: ChildNode | null = node.nextSibling;
    details.appendChild(node);
    node = next;
  }
}

export function renderEmailHtml(
  rawHtml: string,
  email: Email,
  options: { allowRemoteImages: boolean }
): RenderedEmail {
  const clean = DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [...DOMPURIFY_CONFIG.ALLOWED_TAGS, 'details', 'summary'],
    ALLOWED_ATTR: [...DOMPURIFY_CONFIG.ALLOWED_ATTR],
    FORCE_BODY: DOMPURIFY_CONFIG.FORCE_BODY,
  });

  const doc = new DOMParser().parseFromString(clean, 'text/html');
  const blockedImageCount = processImages(doc, email, options.allowRemoteImages);
  hardenLinks(doc);
  collapseQuotes(doc);

  return { html: doc.body.innerHTML, blockedImageCount };
}

function linkifyEscaped(escaped: string): string {
  return escaped.replace(LINKIFY_RE, (match, url, email) =>
    url
      ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
      : `<a href="mailto:${email}">${email}</a>`
  );
}

export function renderPlainText(text: string): string {
  const lines = text.split('\n');
  let quoteStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (ATTRIBUTION_RE.test(line) || line.startsWith('>')) { quoteStart = i; break; }
  }

  const renderBlock = (block: string) =>
    `<pre style="white-space:pre-wrap;word-wrap:break-word;font-family:inherit;margin:0">${linkifyEscaped(escapeHtml(block))}</pre>`;

  if (quoteStart === -1) return renderBlock(text);

  const main = lines.slice(0, quoteStart).join('\n').replace(/\s+$/, '');
  const quoted = lines.slice(quoteStart).join('\n');
  return `${renderBlock(main)}<details class="email-quote"><summary>Show quoted text</summary>${renderBlock(quoted)}</details>`;
}

export function buildEmailSrcDoc(bodyHtml: string, options: { allowRemoteImages: boolean }): string {
  const imgSrc = options.allowRemoteImages ? "'self' data: https: http:" : "'self' data:";
  const csp = [
    "default-src 'none'",
    "script-src 'none'",
    "style-src 'unsafe-inline'",
    `img-src ${imgSrc}`,
    "font-src data:",
    "media-src 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${BASE_CSS}</style></head><body>${bodyHtml}</body></html>`;
}
