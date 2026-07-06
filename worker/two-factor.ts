import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type { Env } from './core-utils';
import type { AuthUser, StoredTwoFactor, StoredPasskey, PendingAuth, TwoFactorStatus, SessionGrant, LoginStep } from '@shared/types';
import { AuthEntity, PendingAuthEntity, generateSessionToken } from './entities';
import {
  encryptSecret, decryptSecret, newTotp, verifyTotp,
  generateBackupCodes, hashBackupCodes, matchBackupCode,
} from './two-factor-crypto';

export interface TwoFactorEnv extends Env {
  TWO_FACTOR_KEY?: string;
}

const ADMIN = 'admin';
const RP_NAME = 'CodePrint Admin';
const SESSION_DURATION = 24 * 60 * 60 * 1000;
const SETUP_TTL_MS = 15 * 60 * 1000;
const LOGIN_TTL_MS = 5 * 60 * 1000;
const MAX_PENDING_ATTEMPTS = 5;
const MAX_LOGIN_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export type FlowKind = PendingAuth['kind'];

export class TwoFactorError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function deriveRp(origin: string | undefined): { rpID: string; origin: string } {
  if (!origin) throw new TwoFactorError(400, 'Missing origin');
  return { rpID: new URL(origin).hostname, origin };
}

// ---------- state helpers ----------

export function isTwoFactorEnabled(user: AuthUser): boolean {
  const tf = user.twoFactor;
  return !!tf && (!!tf.totpSecretEnc || tf.passkeys.length > 0);
}

export function methodsFor(user: AuthUser): { totp: boolean; passkey: boolean; backup: boolean } {
  const tf = user.twoFactor;
  return {
    totp: !!tf?.totpSecretEnc,
    passkey: (tf?.passkeys.length ?? 0) > 0,
    backup: (tf?.backupCodeHashes.length ?? 0) > 0,
  };
}

export function statusFor(user: AuthUser): TwoFactorStatus {
  const tf = user.twoFactor;
  return {
    enabled: isTwoFactorEnabled(user),
    hasTotp: !!tf?.totpSecretEnc,
    passkeys: (tf?.passkeys ?? []).map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt })),
    backupCodesRemaining: tf?.backupCodeHashes.length ?? 0,
  };
}

function emptyTwoFactor(): StoredTwoFactor {
  return { passkeys: [], backupCodeHashes: [] };
}

function requireKey(env: TwoFactorEnv): string {
  if (!env.TWO_FACTOR_KEY) throw new TwoFactorError(500, 'Two-factor encryption key not configured');
  return env.TWO_FACTOR_KEY;
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function loadAdmin(env: Env): Promise<AuthEntity> {
  const entity = new AuthEntity(env, ADMIN);
  if (!(await entity.exists())) throw new TwoFactorError(401, 'Unauthorized');
  return entity;
}

// ---------- pending flow lifecycle ----------

async function createPending(env: Env, kind: FlowKind): Promise<PendingAuth> {
  const record: PendingAuth = {
    id: randomToken(),
    username: ADMIN,
    kind,
    attempts: 0,
    expiresAt: Date.now() + (kind === 'login' ? LOGIN_TTL_MS : SETUP_TTL_MS),
  };
  await PendingAuthEntity.create(env, record);
  return record;
}

async function loadPending(env: Env, token: string, kinds: FlowKind[]): Promise<{ entity: PendingAuthEntity; state: PendingAuth }> {
  const entity = new PendingAuthEntity(env, token);
  if (!(await entity.exists())) throw new TwoFactorError(401, 'Invalid or expired challenge');
  const state = await entity.getState();
  if (!kinds.includes(state.kind) || Date.now() > state.expiresAt || state.attempts >= MAX_PENDING_ATTEMPTS) {
    await PendingAuthEntity.delete(env, token);
    throw new TwoFactorError(401, 'Invalid or expired challenge');
  }
  return { entity, state };
}

async function failPending(env: Env, entity: PendingAuthEntity): Promise<never> {
  await entity.mutate((p) => ({ ...p, attempts: p.attempts + 1 }));
  await recordFailure(env);
  throw new TwoFactorError(401, 'Invalid code');
}

// ---------- lockout ----------

export async function isLocked(env: Env): Promise<boolean> {
  const entity = new AuthEntity(env, ADMIN);
  if (!(await entity.exists())) return false;
  const state = await entity.getState();
  return !!state.lockedUntil && Date.now() < state.lockedUntil;
}

export async function recordFailure(env: Env): Promise<void> {
  const entity = await loadAdmin(env);
  await entity.mutate((u) => {
    const failedAttempts = (u.failedAttempts ?? 0) + 1;
    return { ...u, failedAttempts, lockedUntil: failedAttempts >= MAX_LOGIN_FAILURES ? Date.now() + LOCKOUT_MS : u.lockedUntil };
  });
}

export async function clearFailures(env: Env): Promise<void> {
  const entity = await loadAdmin(env);
  await entity.mutate((u) => ({ ...u, failedAttempts: 0, lockedUntil: 0 }));
}

// ---------- session + enrollment completion ----------

async function grantSession(entity: AuthEntity): Promise<string> {
  const token = generateSessionToken();
  await entity.mutate((u) => ({ ...u, sessionToken: token, tokenExpiry: Date.now() + SESSION_DURATION, failedAttempts: 0, lockedUntil: 0 }));
  return token;
}

export async function issueSession(env: Env): Promise<string> {
  return grantSession(await loadAdmin(env));
}

async function completeFlow(
  env: Env,
  flow: { entity: PendingAuthEntity; state: PendingAuth },
  update: (tf: StoredTwoFactor) => StoredTwoFactor
): Promise<SessionGrant | { status: TwoFactorStatus }> {
  const admin = await loadAdmin(env);
  const wasEnabled = isTwoFactorEnabled(await admin.getState());
  let backupCodes: string[] | undefined;
  const hashes = wasEnabled ? undefined : await hashBackupCodes((backupCodes = generateBackupCodes()));
  await admin.mutate((u) => {
    const tf = update(u.twoFactor ?? emptyTwoFactor());
    return { ...u, twoFactor: hashes ? { ...tf, backupCodeHashes: hashes } : tf };
  });
  await PendingAuthEntity.delete(env, flow.state.id);
  if (flow.state.kind === 'enroll') {
    return { token: await grantSession(admin), user: { username: ADMIN }, backupCodes };
  }
  return { status: statusFor(await admin.getState()) };
}

// ---------- entry points ----------

export async function beginAfterPassword(env: Env): Promise<LoginStep> {
  const admin = await loadAdmin(env);
  const user = await admin.getState();
  if (!isTwoFactorEnabled(user)) {
    const pending = await createPending(env, 'enroll');
    return { step: 'setup', setupToken: pending.id };
  }
  const pending = await createPending(env, 'login');
  return { step: '2fa', challengeToken: pending.id, methods: methodsFor(user) };
}

async function beginEnrollOrManage(env: Env, setupToken: string | undefined, sessionValid: boolean): Promise<{ entity: PendingAuthEntity; state: PendingAuth }> {
  if (setupToken) return loadPending(env, setupToken, ['enroll']);
  if (sessionValid) {
    const pending = await createPending(env, 'manage');
    return { entity: new PendingAuthEntity(env, pending.id), state: pending };
  }
  throw new TwoFactorError(401, 'Unauthorized');
}

// ---------- TOTP enrollment ----------

export async function totpSetup(env: TwoFactorEnv, setupToken: string | undefined, sessionValid: boolean): Promise<{ otpauthUri: string; secret: string; flowToken: string }> {
  const key = requireKey(env);
  const { entity, state } = await beginEnrollOrManage(env, setupToken, sessionValid);
  const { secret, otpauthUri } = newTotp();
  const totpSecretEnc = await encryptSecret(secret, key);
  await entity.mutate((p) => ({ ...p, totpSecretEnc }));
  return { otpauthUri, secret, flowToken: state.id };
}

export async function totpConfirm(env: TwoFactorEnv, flowToken: string, code: string): Promise<SessionGrant | { status: TwoFactorStatus }> {
  const key = requireKey(env);
  const flow = await loadPending(env, flowToken, ['enroll', 'manage']);
  if (!flow.state.totpSecretEnc) throw new TwoFactorError(400, 'No pending TOTP setup');
  const secret = await decryptSecret(flow.state.totpSecretEnc, key);
  if (!verifyTotp(secret, code)) await failPending(env, flow.entity);
  const secretEnc = flow.state.totpSecretEnc;
  return completeFlow(env, flow, (tf) => ({ ...tf, totpSecretEnc: secretEnc }));
}

// ---------- passkey enrollment ----------

export async function passkeyRegisterOptions(env: Env, origin: string | undefined, setupToken: string | undefined, sessionValid: boolean): Promise<{ options: unknown; flowToken: string }> {
  const { rpID } = deriveRp(origin);
  const { entity, state } = await beginEnrollOrManage(env, setupToken, sessionValid);
  const admin = await loadAdmin(env);
  const existing = (await admin.getState()).twoFactor?.passkeys ?? [];
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: ADMIN,
    userID: new TextEncoder().encode(ADMIN),
    attestationType: 'none',
    excludeCredentials: existing.map((p) => ({ id: p.id, transports: p.transports as never })),
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  });
  await entity.mutate((p) => ({ ...p, challenge: options.challenge }));
  return { options, flowToken: state.id };
}

export async function passkeyRegister(env: Env, origin: string | undefined, flowToken: string, response: RegistrationResponseJSON, name: string): Promise<SessionGrant | { status: TwoFactorStatus }> {
  const { rpID, origin: expectedOrigin } = deriveRp(origin);
  const flow = await loadPending(env, flowToken, ['enroll', 'manage']);
  if (!flow.state.challenge) throw new TwoFactorError(400, 'No pending passkey registration');
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: flow.state.challenge,
    expectedOrigin,
    expectedRPID: rpID,
  });
  if (!verification.verified || !verification.registrationInfo) await failPending(env, flow.entity);
  const cred = verification.registrationInfo!.credential;
  const passkey: StoredPasskey = {
    id: cred.id,
    publicKey: isoBase64URL.fromBuffer(cred.publicKey),
    counter: cred.counter,
    transports: cred.transports,
    name: name.trim().slice(0, 60) || 'Passkey',
    createdAt: Date.now(),
  };
  return completeFlow(env, flow, (tf) => ({ ...tf, passkeys: [...tf.passkeys, passkey] }));
}

// ---------- login second factor ----------

export async function loginTotp(env: TwoFactorEnv, challengeToken: string, code: string): Promise<SessionGrant> {
  const key = requireKey(env);
  const flow = await loadPending(env, challengeToken, ['login']);
  const admin = await loadAdmin(env);
  const enc = (await admin.getState()).twoFactor?.totpSecretEnc;
  if (!enc) throw new TwoFactorError(400, 'TOTP not configured');
  if (!verifyTotp(await decryptSecret(enc, key), code)) await failPending(env, flow.entity);
  await PendingAuthEntity.delete(env, challengeToken);
  return { token: await grantSession(admin), user: { username: ADMIN } };
}

export async function loginBackup(env: Env, challengeToken: string, code: string): Promise<SessionGrant> {
  const flow = await loadPending(env, challengeToken, ['login']);
  const admin = await loadAdmin(env);
  const hashes = (await admin.getState()).twoFactor?.backupCodeHashes ?? [];
  const idx = await matchBackupCode(hashes, code);
  if (idx < 0) await failPending(env, flow.entity);
  await admin.mutate((u) => ({
    ...u,
    twoFactor: u.twoFactor ? { ...u.twoFactor, backupCodeHashes: u.twoFactor.backupCodeHashes.filter((_, i) => i !== idx) } : u.twoFactor,
  }));
  await PendingAuthEntity.delete(env, challengeToken);
  return { token: await grantSession(admin), user: { username: ADMIN } };
}

export async function loginPasskeyOptions(env: Env, origin: string | undefined, challengeToken: string): Promise<unknown> {
  const { rpID } = deriveRp(origin);
  const { entity } = await loadPending(env, challengeToken, ['login']);
  const admin = await loadAdmin(env);
  const passkeys = (await admin.getState()).twoFactor?.passkeys ?? [];
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: passkeys.map((p) => ({ id: p.id, transports: p.transports as never })),
    userVerification: 'preferred',
  });
  await entity.mutate((p) => ({ ...p, challenge: options.challenge }));
  return options;
}

export async function loginPasskey(env: Env, origin: string | undefined, challengeToken: string, response: AuthenticationResponseJSON): Promise<SessionGrant> {
  const { rpID, origin: expectedOrigin } = deriveRp(origin);
  const flow = await loadPending(env, challengeToken, ['login']);
  if (!flow.state.challenge) throw new TwoFactorError(400, 'No pending passkey challenge');
  const admin = await loadAdmin(env);
  const passkeys = (await admin.getState()).twoFactor?.passkeys ?? [];
  const passkey = passkeys.find((p) => p.id === response.id);
  if (!passkey) await failPending(env, flow.entity);
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: flow.state.challenge,
    expectedOrigin,
    expectedRPID: rpID,
    credential: {
      id: passkey!.id,
      publicKey: isoBase64URL.toBuffer(passkey!.publicKey),
      counter: passkey!.counter,
      transports: passkey!.transports as never,
    },
  });
  if (!verification.verified) await failPending(env, flow.entity);
  const newCounter = verification.authenticationInfo.newCounter;
  await admin.mutate((u) => ({
    ...u,
    twoFactor: u.twoFactor ? { ...u.twoFactor, passkeys: u.twoFactor.passkeys.map((p) => (p.id === passkey!.id ? { ...p, counter: newCounter } : p)) } : u.twoFactor,
  }));
  await PendingAuthEntity.delete(env, challengeToken);
  return { token: await grantSession(admin), user: { username: ADMIN } };
}

// ---------- management (session-only) ----------

export async function getStatus(env: Env): Promise<TwoFactorStatus> {
  return statusFor(await (await loadAdmin(env)).getState());
}

export async function removePasskey(env: Env, id: string): Promise<TwoFactorStatus> {
  const admin = await loadAdmin(env);
  const user = await admin.getState();
  const tf = user.twoFactor;
  if (!tf) throw new TwoFactorError(404, 'Not found');
  const remaining = tf.passkeys.filter((p) => p.id !== id);
  if (remaining.length === tf.passkeys.length) throw new TwoFactorError(404, 'Passkey not found');
  if (!tf.totpSecretEnc && remaining.length === 0) throw new TwoFactorError(400, 'Cannot remove your last factor');
  await admin.mutate((u) => ({ ...u, twoFactor: { ...u.twoFactor!, passkeys: remaining } }));
  return statusFor(await admin.getState());
}

export async function disableTotp(env: Env): Promise<TwoFactorStatus> {
  const admin = await loadAdmin(env);
  const tf = (await admin.getState()).twoFactor;
  if (!tf?.totpSecretEnc) throw new TwoFactorError(404, 'TOTP not configured');
  if (tf.passkeys.length === 0) throw new TwoFactorError(400, 'Cannot remove your last factor');
  await admin.mutate((u) => ({ ...u, twoFactor: { ...u.twoFactor!, totpSecretEnc: undefined } }));
  return statusFor(await admin.getState());
}

export async function regenerateBackupCodes(env: Env): Promise<string[]> {
  const admin = await loadAdmin(env);
  if (!isTwoFactorEnabled(await admin.getState())) throw new TwoFactorError(400, 'Two-factor not enabled');
  const codes = generateBackupCodes();
  const backupCodeHashes = await hashBackupCodes(codes);
  await admin.mutate((u) => ({ ...u, twoFactor: { ...(u.twoFactor ?? emptyTwoFactor()), backupCodeHashes } }));
  return codes;
}
