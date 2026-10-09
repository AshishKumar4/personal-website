import type { AuthUser } from '@shared/types';
import { generateSalt, hashPasswordPBKDF2 } from './auth-crypto';
import { hashSecret, timingSafeEqualHex } from './api-token';

async function markerFor(password: string, salt: string): Promise<string> {
  return `${salt}:${await hashPasswordPBKDF2(password, salt)}`;
}

async function alreadyRecovered(user: AuthUser, recoveryPassword: string): Promise<boolean> {
  if (!user.recoveryMarker) return false;
  const [salt] = user.recoveryMarker.split(':');
  return timingSafeEqualHex(await markerFor(recoveryPassword, salt), user.recoveryMarker);
}

export async function recoveredAdmin(user: AuthUser, password: string, recoveryPassword: string | undefined): Promise<AuthUser | null> {
  if (!recoveryPassword) return null;
  if (!timingSafeEqualHex(await hashSecret(password), await hashSecret(recoveryPassword))) return null;
  if (await alreadyRecovered(user, recoveryPassword)) return null;
  const salt = generateSalt();
  return {
    username: user.username,
    salt,
    hashedPassword: await hashPasswordPBKDF2(recoveryPassword, salt),
    recoveryMarker: await markerFor(recoveryPassword, generateSalt()),
  };
}
