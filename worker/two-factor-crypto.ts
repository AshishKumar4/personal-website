import * as OTPAuth from 'otpauth';
import { sha256Hex } from './mail-encoding';
import { timingSafeEqualHex } from './api-token';

const ADMIN = 'admin';
const TOTP_ISSUER = 'CodePrint Admin';

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}
function bytesToB64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

async function importAesKey(keyB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', b64ToBytes(keyB64), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(plaintext: string, keyB64: string): Promise<string> {
  const key = await importAesKey(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return bytesToB64(out);
}

export async function decryptSecret(enc: string, keyB64: string): Promise<string> {
  const key = await importAesKey(keyB64);
  const data = b64ToBytes(enc);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: data.slice(0, 12) }, key, data.slice(12));
  return new TextDecoder().decode(pt);
}

function totpFor(secretBase32: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({ issuer: TOTP_ISSUER, label: ADMIN, algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secretBase32) });
}

export function newTotp(): { secret: string; otpauthUri: string } {
  const secret = new OTPAuth.Secret({ size: 20 });
  return { secret: secret.base32, otpauthUri: totpFor(secret.base32).toString() };
}

export function totpCodeAt(secretBase32: string, timestamp: number): string {
  return totpFor(secretBase32).generate({ timestamp });
}

export function verifyTotp(secretBase32: string, code: string): boolean {
  const token = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(token)) return false;
  return totpFor(secretBase32).validate({ token, window: 1 }) !== null;
}

function normalizeCode(code: string): string {
  return code.replace(/[\s-]/g, '').toLowerCase();
}

export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    codes.push(hex.replace(/(.{4})(?=.)/g, '$1-'));
  }
  return codes;
}

export function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((c) => sha256Hex(normalizeCode(c))));
}

export async function matchBackupCode(hashes: string[], code: string): Promise<number> {
  const target = await sha256Hex(normalizeCode(code));
  for (let i = 0; i < hashes.length; i++) {
    if (timingSafeEqualHex(hashes[i], target)) return i;
  }
  return -1;
}
