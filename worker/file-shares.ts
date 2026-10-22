import type { ShareLink } from '@shared/types';
import { randomBase64url } from './api-token';
import { contentDispositionHeader, PASSIVE_INLINE_TYPE } from './mail-encoding';

const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const SHARE_HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex',
  'Referrer-Policy': 'no-referrer',
};

interface ByteRange {
  offset: number;
  length: number;
}

export function generateShareToken(): string {
  return randomBase64url(TOKEN_BYTES);
}

export function isShareToken(value: string): boolean {
  return TOKEN_PATTERN.test(value);
}

export function isLiveShareLink(link: ShareLink, now: number): boolean {
  return link.key !== '' && (link.expiresAt === null || now < link.expiresAt);
}

function requestedRange(headers: Headers, object: R2Object): ByteRange | 'unsatisfiable' | null {
  const header = headers.get('Range');
  if (header === null) return null;
  const ifRange = headers.get('If-Range');
  if (ifRange !== null && ifRange !== object.httpEtag && ifRange !== object.uploaded.toUTCString()) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) return null;
  if (match[1] === '') {
    const length = Math.min(Number(match[2]), object.size);
    return length > 0 ? { offset: object.size - length, length } : 'unsatisfiable';
  }
  const first = Number(match[1]);
  const last = match[2] === '' ? Infinity : Number(match[2]);
  if (last < first) return null;
  if (first >= object.size) return 'unsatisfiable';
  return { offset: first, length: Math.min(last, object.size - 1) - first + 1 };
}

export async function sharedFileResponse(bucket: R2Bucket, link: ShareLink, request: Request): Promise<Response | null> {
  const head = await bucket.head(link.key);
  if (!head || head.etag !== link.etag) return null;
  const headers = new Headers(SHARE_HEADERS);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('ETag', head.httpEtag);
  headers.set('Last-Modified', head.uploaded.toUTCString());
  const range = request.method === 'GET' ? requestedRange(request.headers, head) : null;
  if (range === 'unsatisfiable') {
    headers.set('Content-Range', `bytes */${head.size}`);
    return new Response(null, { status: 416, headers });
  }
  const contentType = head.httpMetadata?.contentType || 'application/octet-stream';
  const fileName = link.key.slice(link.key.lastIndexOf('/') + 1);
  headers.set('Content-Type', contentType);
  headers.set('Content-Disposition', contentDispositionHeader(PASSIVE_INLINE_TYPE.test(contentType) ? 'inline' : 'attachment', fileName));
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Length', String(range ? range.length : head.size));
  if (request.method === 'HEAD') return new Response(null, { headers });
  const onlyIf = { etagMatches: link.etag };
  const object = await bucket.get(link.key, range ? { range, onlyIf } : { onlyIf });
  if (!object || !('body' in object)) return null;
  if (!range) return new Response(object.body, { headers });
  headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`);
  return new Response(object.body, { status: 206, headers });
}
