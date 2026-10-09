import { describe, expect, test } from 'bun:test';
import type { AuthUser } from '@shared/types';
import { recoveredAdmin } from './admin-recovery';
import { generateSalt, hashPasswordPBKDF2 } from './auth-crypto';

const RECOVERY = 'correct horse battery staple';

async function adminWith(password: string, extra: Partial<AuthUser> = {}): Promise<AuthUser> {
  const salt = generateSalt();
  return {
    username: 'admin',
    salt,
    hashedPassword: await hashPasswordPBKDF2(password, salt),
    sessionToken: 'live-session',
    tokenExpiry: Date.now() + 60_000,
    twoFactor: { totpSecretEnc: 'lost-authenticator', passkeys: [], backupCodeHashes: ['lost-code'] },
    failedAttempts: 5,
    lockedUntil: Date.now() + 60_000,
    ...extra,
  };
}

async function acceptsPassword(user: AuthUser, password: string) {
  return !!user.salt && (await hashPasswordPBKDF2(password, user.salt)) === user.hashedPassword;
}

describe('recoveredAdmin', () => {
  test('does nothing when no recovery password is configured', async () => {
    const user = await adminWith('forgotten');
    expect(await recoveredAdmin(user, RECOVERY, undefined)).toBeNull();
    expect(await recoveredAdmin(user, '', '')).toBeNull();
  });

  test('does nothing when the login password is not the recovery password', async () => {
    const user = await adminWith('forgotten');
    expect(await recoveredAdmin(user, 'forgotten', RECOVERY)).toBeNull();
    expect(await recoveredAdmin(user, `${RECOVERY} `, RECOVERY)).toBeNull();
  });

  test('sets the recovery password and clears second factors, sessions and the lockout', async () => {
    const recovered = await recoveredAdmin(await adminWith('forgotten'), RECOVERY, RECOVERY);
    if (!recovered) throw new Error('expected a recovered admin');
    expect(recovered.username).toBe('admin');
    expect(await acceptsPassword(recovered, RECOVERY)).toBe(true);
    expect(await acceptsPassword(recovered, 'forgotten')).toBe(false);
    expect(recovered.twoFactor).toBeUndefined();
    expect(recovered.sessionToken).toBeUndefined();
    expect(recovered.lockedUntil).toBeUndefined();
    expect(recovered.failedAttempts).toBeUndefined();
    expect(recovered.recoveryMarker).not.toContain(RECOVERY);
  });

  test('clears second factors even when the recovery password equals the current password', async () => {
    const recovered = await recoveredAdmin(await adminWith(RECOVERY), RECOVERY, RECOVERY);
    if (!recovered) throw new Error('expected a recovered admin');
    expect(await acceptsPassword(recovered, RECOVERY)).toBe(true);
    expect(recovered.twoFactor).toBeUndefined();
  });

  test('applies each recovery password only once, so a newly enrolled factor survives', async () => {
    const recovered = await recoveredAdmin(await adminWith('forgotten'), RECOVERY, RECOVERY);
    if (!recovered) throw new Error('expected a recovered admin');
    const reEnrolled: AuthUser = { ...recovered, twoFactor: { totpSecretEnc: 'new-authenticator', passkeys: [], backupCodeHashes: [] } };
    expect(await recoveredAdmin(reEnrolled, RECOVERY, RECOVERY)).toBeNull();

    const changedPassword = { ...(await adminWith('changed-later')), recoveryMarker: recovered.recoveryMarker };
    expect(await recoveredAdmin(changedPassword, RECOVERY, RECOVERY)).toBeNull();
  });

  test('a new recovery password applies again', async () => {
    const recovered = await recoveredAdmin(await adminWith('forgotten'), RECOVERY, RECOVERY);
    if (!recovered) throw new Error('expected a recovered admin');
    const again = await recoveredAdmin({ ...recovered, twoFactor: { passkeys: [], backupCodeHashes: ['x'] } }, 'a second recovery', 'a second recovery');
    if (!again) throw new Error('expected a second recovery');
    expect(await acceptsPassword(again, 'a second recovery')).toBe(true);
    expect(again.twoFactor).toBeUndefined();
  });
});
