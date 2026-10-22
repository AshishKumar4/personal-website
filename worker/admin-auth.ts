import type { Context } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Env } from './core-utils';
import { AuthEntity, ApiTokenEntity } from './entities';
import { parseApiToken, isApiTokenString, hashSecret, timingSafeEqualHex } from './api-token';

type AuthContext = Context<{ Bindings: Env }>;

function getBearer(c: AuthContext): string | null {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

async function isValidSessionToken(c: AuthContext, token: string): Promise<boolean> {
  const adminUser = new AuthEntity(c.env, "admin");
  if (!(await adminUser.exists())) return false;
  const storedUser = await adminUser.getState();
  if (!storedUser.sessionToken || storedUser.sessionToken !== token) return false;
  if (!storedUser.tokenExpiry || Date.now() > storedUser.tokenExpiry) return false;
  return true;
}

async function isValidApiToken(c: AuthContext, token: string): Promise<boolean> {
  const parsed = parseApiToken(token);
  if (!parsed) return false;
  const entity = new ApiTokenEntity(c.env, parsed.keyId);
  if (!(await entity.exists())) return false;
  const record = await entity.getState();
  if (Date.now() > record.expiresAt) return false;
  const presentedHash = await hashSecret(parsed.secret);
  if (!timingSafeEqualHex(presentedHash, record.secretHash)) return false;
  await entity.mutate(r => ({ ...r, lastUsedAt: Date.now() })).catch(() => {});
  return true;
}

export const sessionAuthMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const token = getBearer(c);
  if (!token || !(await isValidSessionToken(c, token))) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }
  await next();
});

export const adminAuthMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const token = getBearer(c);
  if (!token) return c.json({ success: false, error: 'Unauthorized' }, 401);
  const valid = isApiTokenString(token)
    ? await isValidApiToken(c, token)
    : await isValidSessionToken(c, token);
  if (!valid) return c.json({ success: false, error: 'Unauthorized' }, 401);
  await next();
});

export async function hasValidSession(c: AuthContext): Promise<boolean> {
  const token = getBearer(c);
  return !!token && !isApiTokenString(token) && isValidSessionToken(c, token);
}
