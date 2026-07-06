import { expect, test, describe } from 'bun:test';
import {
  generateApiToken,
  parseApiToken,
  isApiTokenString,
  hashSecret,
  timingSafeEqualHex,
  TOKEN_PREFIX,
} from './api-token';
import { clampTtlMinutes, API_TOKEN_MAX_TTL_MINUTES, API_TOKEN_DEFAULT_TTL_MINUTES } from '@shared/types';

describe('generate + parse round-trip', () => {
  test('generated token parses back to its keyId and secret', () => {
    const { keyId, secret, token } = generateApiToken();
    expect(token.startsWith(TOKEN_PREFIX)).toBe(true);
    const parsed = parseApiToken(token);
    expect(parsed).toEqual({ keyId, secret });
  });

  test('generates distinct high-entropy tokens', () => {
    const a = generateApiToken();
    const b = generateApiToken();
    expect(a.token).not.toBe(b.token);
    expect(a.secret.length).toBeGreaterThanOrEqual(40);
  });
});

describe('parseApiToken rejects malformed input', () => {
  test.each([
    ['', 'empty'],
    ['sk_live_abc.def', 'wrong prefix'],
    ['cpk_onlykeyid', 'no separator'],
    ['cpk_.secret', 'empty keyId'],
    ['cpk_keyid.', 'empty secret'],
    ['cpk_key id.secret', 'space in keyId'],
    ['cpk_keyid.sec ret', 'space in secret'],
    ['cpk_keyid.sec/ret', 'invalid base64url char'],
  ])('rejects %s (%s)', (input) => {
    expect(parseApiToken(input)).toBeNull();
  });

  test('isApiTokenString only true for prefix', () => {
    expect(isApiTokenString('cpk_x.y')).toBe(true);
    expect(isApiTokenString('deadbeef')).toBe(false);
  });
});

describe('hashSecret + timingSafeEqualHex', () => {
  test('same secret hashes equal, different secret differs', async () => {
    const h1 = await hashSecret('secret-value');
    const h2 = await hashSecret('secret-value');
    const h3 = await hashSecret('other-value');
    expect(timingSafeEqualHex(h1, h2)).toBe(true);
    expect(timingSafeEqualHex(h1, h3)).toBe(false);
  });

  test('different lengths are not equal', () => {
    expect(timingSafeEqualHex('abcd', 'abc')).toBe(false);
  });
});

describe('clampTtlMinutes', () => {
  test('clamps and defaults correctly', () => {
    expect(clampTtlMinutes(30)).toBe(30);
    expect(clampTtlMinutes(999999)).toBe(API_TOKEN_MAX_TTL_MINUTES);
    expect(clampTtlMinutes(0)).toBe(API_TOKEN_DEFAULT_TTL_MINUTES);
    expect(clampTtlMinutes(-5)).toBe(API_TOKEN_DEFAULT_TTL_MINUTES);
    expect(clampTtlMinutes(NaN)).toBe(API_TOKEN_DEFAULT_TTL_MINUTES);
  });
});
