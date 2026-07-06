export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export function htmlToSnippet(html: string | undefined, maxLength = 100): string {
  if (!html) return '';
  const text = html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

const MESSAGE_ID_TOKEN = /<([^>]+)>/;

export function extractMessageIdToken(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.match(MESSAGE_ID_TOKEN);
  if (!match) return null;
  return match[1].replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 64);
}

export function isSafeMessageIdHeader(value: string): boolean {
  return /^<[^\s<>]+>$/.test(value.trim());
}

export function normalizeSubject(subject: string): string {
  return subject.replace(/^(re|fwd|fw):\s*/gi, '').toLowerCase().trim();
}

/**
 * Thread grouping key. Reply chains key off the referenced Message-ID (stable
 * across a conversation); first-contact mail falls back to an account-scoped
 * SHA-256 of the normalized subject — Unicode-safe and collision-resistant,
 * and scoped so unrelated recipients can never share a thread.
 */
export async function generateThreadId(
  account: string,
  subject: string,
  references?: string[],
  inReplyTo?: string
): Promise<string> {
  const fromInReplyTo = extractMessageIdToken(inReplyTo);
  if (fromInReplyTo) return fromInReplyTo;
  const fromReferences = extractMessageIdToken(references?.[0]);
  if (fromReferences) return fromReferences;
  const digest = await sha256Hex(`${account} ${normalizeSubject(subject)}`);
  return `s${digest.slice(0, 31)}`;
}
