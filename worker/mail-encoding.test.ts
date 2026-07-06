import { expect, test, describe } from 'bun:test';
import {
  arrayBufferToBase64,
  htmlToSnippet,
  extractMessageIdToken,
  isSafeMessageIdHeader,
  normalizeSubject,
  generateThreadId,
} from './mail-encoding';

describe('generateThreadId', () => {
  test('does not throw on Unicode subjects (regression: btoa crash → silent mail loss)', async () => {
    for (const subject of ['こんにちは', 'Hi 👋', 'Δοκιμή', 'Привет', 'Réservation', '会議の件']) {
      const id = await generateThreadId('me', subject);
      expect(id).toMatch(/^s[0-9a-f]{31}$/);
    }
  });

  test('same subject + account is stable; different account differs (no cross-account bleed)', async () => {
    const a1 = await generateThreadId('me', 'Invoice');
    const a2 = await generateThreadId('me', 'Invoice');
    const b = await generateThreadId('contact', 'Invoice');
    expect(a1).toBe(a2);
    expect(a1).not.toBe(b);
  });

  test('Re:/Fwd: prefixes normalize to the same thread', async () => {
    const base = await generateThreadId('me', 'Project update');
    expect(await generateThreadId('me', 'Re: Project update')).toBe(base);
    expect(await generateThreadId('me', 'FWD: Project update')).toBe(base);
  });

  test('reply chains key off the referenced Message-ID, not subject', async () => {
    const byReply = await generateThreadId('me', 'anything', undefined, '<abc123@example.com>');
    const byRef = await generateThreadId('me', 'anything', ['<abc123@example.com>']);
    expect(byReply).toBe('abc123_example.com');
    expect(byRef).toBe('abc123_example.com');
  });
});

describe('arrayBufferToBase64', () => {
  test('encodes large buffers without RangeError (regression: spread stack overflow)', () => {
    const buf = new Uint8Array(300_000);
    for (let i = 0; i < buf.length; i++) buf[i] = i % 256;
    const b64 = arrayBufferToBase64(buf.buffer);
    expect(b64.length).toBeGreaterThan(0);
    expect(Uint8Array.from(atob(b64), c => c.charCodeAt(0))).toEqual(buf);
  });

  test('round-trips arbitrary binary', () => {
    const bytes = new Uint8Array([0, 255, 1, 254, 128, 127]);
    expect(Uint8Array.from(atob(arrayBufferToBase64(bytes.buffer)), c => c.charCodeAt(0))).toEqual(bytes);
  });
});

describe('htmlToSnippet', () => {
  test('derives readable text from HTML-only email (regression: empty snippet)', () => {
    expect(htmlToSnippet('<style>.x{}</style><p>Hello&nbsp;<b>world</b></p>')).toBe('Hello world');
  });
  test('empty for undefined', () => {
    expect(htmlToSnippet(undefined)).toBe('');
  });
});

describe('message-id helpers', () => {
  test('extractMessageIdToken sanitizes and bounds', () => {
    expect(extractMessageIdToken('<abc@d.com>')).toBe('abc_d.com');
    expect(extractMessageIdToken('no brackets')).toBeNull();
    expect(extractMessageIdToken(undefined)).toBeNull();
  });
  test('isSafeMessageIdHeader rejects CRLF injection', () => {
    expect(isSafeMessageIdHeader('<abc@d.com>')).toBe(true);
    expect(isSafeMessageIdHeader('<abc>\r\nBcc: evil@x.com')).toBe(false);
    expect(isSafeMessageIdHeader('<a b>')).toBe(false);
  });
});

describe('normalizeSubject', () => {
  test('strips reply/forward prefixes case-insensitively', () => {
    expect(normalizeSubject('RE: Hello')).toBe('hello');
    expect(normalizeSubject('Fwd:  Spaced ')).toBe('spaced');
  });
});
