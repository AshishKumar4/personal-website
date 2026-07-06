import { sha256Hex } from './mail-encoding';

export const TOKEN_PREFIX = 'cpk_';
const KEY_ID_BYTES = 8;
const SECRET_BYTES = 32;

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomBase64url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export interface GeneratedApiToken {
  keyId: string;
  secret: string;
  token: string;
}

export function generateApiToken(): GeneratedApiToken {
  const keyId = randomBase64url(KEY_ID_BYTES);
  const secret = randomBase64url(SECRET_BYTES);
  return { keyId, secret, token: `${TOKEN_PREFIX}${keyId}.${secret}` };
}

export function isApiTokenString(raw: string): boolean {
  return raw.startsWith(TOKEN_PREFIX);
}

export function parseApiToken(raw: string): { keyId: string; secret: string } | null {
  if (!raw.startsWith(TOKEN_PREFIX)) return null;
  const rest = raw.slice(TOKEN_PREFIX.length);
  const dot = rest.indexOf('.');
  if (dot <= 0 || dot === rest.length - 1) return null;
  const keyId = rest.slice(0, dot);
  const secret = rest.slice(dot + 1);
  if (!/^[A-Za-z0-9_-]+$/.test(keyId) || !/^[A-Za-z0-9_-]+$/.test(secret)) return null;
  return { keyId, secret };
}

export function hashSecret(secret: string): Promise<string> {
  return sha256Hex(secret);
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
