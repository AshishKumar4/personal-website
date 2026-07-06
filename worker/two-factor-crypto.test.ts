import { expect, test, describe } from 'bun:test';
import {
  encryptSecret, decryptSecret, newTotp, verifyTotp, totpCodeAt,
  generateBackupCodes, hashBackupCodes, matchBackupCode,
} from './two-factor-crypto';

const KEY = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');

describe('AES-GCM secret encryption', () => {
  test('round-trips', async () => {
    const enc = await encryptSecret('JBSWY3DPEHPK3PXP', KEY);
    expect(enc).not.toContain('JBSWY3DPEHPK3PXP');
    expect(await decryptSecret(enc, KEY)).toBe('JBSWY3DPEHPK3PXP');
  });
  test('same plaintext gives different ciphertext (random IV)', async () => {
    expect(await encryptSecret('x', KEY)).not.toBe(await encryptSecret('x', KEY));
  });
  test('wrong key fails to decrypt', async () => {
    const enc = await encryptSecret('secret', KEY);
    const otherKey = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
    await expect(decryptSecret(enc, otherKey)).rejects.toThrow();
  });
});

describe('TOTP', () => {
  test('RFC 6238 SHA-1 vector at t=59 → 287082', () => {
    // RFC 6238 test seed "12345678901234567890" = base32 GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    expect(totpCodeAt(secret, 59 * 1000)).toBe('287082');
    expect(totpCodeAt(secret, 1111111109 * 1000)).toBe('081804');
  });
  test('verifyTotp accepts a freshly generated code and rejects a wrong one', () => {
    const { secret } = newTotp();
    const code = totpCodeAt(secret, Date.now());
    expect(verifyTotp(secret, code)).toBe(true);
    expect(verifyTotp(secret, '000000')).toBe(false);
    expect(verifyTotp(secret, 'abc')).toBe(false);
  });
  test('accepts a code from the previous 30s window (drift)', () => {
    const { secret } = newTotp();
    const prev = totpCodeAt(secret, Date.now() - 30_000);
    expect(verifyTotp(secret, prev)).toBe(true);
  });
});

describe('backup codes', () => {
  test('generate → hash → match → not reusable after removal', async () => {
    const codes = generateBackupCodes(10);
    expect(codes).toHaveLength(10);
    expect(codes[0]).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}$/);
    const hashes = await hashBackupCodes(codes);
    const idx = await matchBackupCode(hashes, codes[3]);
    expect(idx).toBe(3);
    expect(await matchBackupCode(hashes, 'zzzz-zzzz')).toBe(-1);
    const remaining = hashes.filter((_, i) => i !== idx);
    expect(await matchBackupCode(remaining, codes[3])).toBe(-1);
  });
  test('match is case/format-insensitive', async () => {
    const codes = generateBackupCodes(1);
    const hashes = await hashBackupCodes(codes);
    expect(await matchBackupCode(hashes, codes[0].replace('-', '').toUpperCase())).toBe(0);
  });
});
