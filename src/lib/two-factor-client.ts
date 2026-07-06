import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import { api } from './api-client';
import { getToken, saveToken } from './auth';
import type { LoginStep, SessionGrant, TwoFactorStatus } from '@shared/types';

export type EnrollAuth = { setupToken: string } | { session: true };

function authRequest(auth: EnrollAuth): { headers?: Record<string, string>; extra: Record<string, unknown> } {
  return 'setupToken' in auth
    ? { extra: { setupToken: auth.setupToken } }
    : { headers: { Authorization: `Bearer ${getToken()}` }, extra: {} };
}

function sessionHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getToken()}` };
}

function grant<T extends { token?: string }>(res: T): T {
  if (res.token) saveToken(res.token);
  return res;
}

export function login(username: string, password: string): Promise<LoginStep> {
  return api<LoginStep>('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}

// --- login second factor ---
export async function loginTotp(challengeToken: string, code: string): Promise<SessionGrant> {
  return grant(await api<SessionGrant>('/api/2fa/login/totp', { method: 'POST', body: JSON.stringify({ challengeToken, code }) }));
}
export async function loginBackup(challengeToken: string, code: string): Promise<SessionGrant> {
  return grant(await api<SessionGrant>('/api/2fa/login/backup', { method: 'POST', body: JSON.stringify({ challengeToken, code }) }));
}
export async function loginPasskey(challengeToken: string): Promise<SessionGrant> {
  const options = await api<PublicKeyCredentialRequestOptionsJSON>('/api/2fa/login/passkey/options', {
    method: 'POST', body: JSON.stringify({ challengeToken }),
  });
  const response = await startAuthentication({ optionsJSON: options });
  return grant(await api<SessionGrant>('/api/2fa/login/passkey', { method: 'POST', body: JSON.stringify({ challengeToken, response }) }));
}

// --- enrollment / management ---
export function totpSetup(auth: EnrollAuth): Promise<{ otpauthUri: string; secret: string; flowToken: string }> {
  const { headers, extra } = authRequest(auth);
  return api('/api/2fa/totp/setup', { method: 'POST', headers, body: JSON.stringify(extra) });
}
export async function totpConfirm(flowToken: string, code: string): Promise<SessionGrant | { status: TwoFactorStatus }> {
  const res = await api<SessionGrant | { status: TwoFactorStatus }>('/api/2fa/totp/confirm', { method: 'POST', body: JSON.stringify({ flowToken, code }) });
  return 'token' in res ? grant(res) : res;
}
export async function registerPasskey(auth: EnrollAuth, name: string): Promise<SessionGrant | { status: TwoFactorStatus }> {
  const { headers, extra } = authRequest(auth);
  const { options, flowToken } = await api<{ options: PublicKeyCredentialCreationOptionsJSON; flowToken: string }>(
    '/api/2fa/passkey/register/options', { method: 'POST', headers, body: JSON.stringify(extra) },
  );
  const response = await startRegistration({ optionsJSON: options });
  const res = await api<SessionGrant | { status: TwoFactorStatus }>('/api/2fa/passkey/register', { method: 'POST', body: JSON.stringify({ flowToken, response, name }) });
  return 'token' in res ? grant(res) : res;
}

// --- management (session-only) ---
export function getStatus(): Promise<TwoFactorStatus> {
  return api<TwoFactorStatus>('/api/2fa/status', { headers: sessionHeaders() });
}
export function removePasskey(id: string): Promise<TwoFactorStatus> {
  return api<TwoFactorStatus>(`/api/2fa/passkey/${encodeURIComponent(id)}`, { method: 'DELETE', headers: sessionHeaders() });
}
export function disableTotp(): Promise<TwoFactorStatus> {
  return api<TwoFactorStatus>('/api/2fa/totp', { method: 'DELETE', headers: sessionHeaders() });
}
export function regenerateBackupCodes(): Promise<{ codes: string[] }> {
  return api<{ codes: string[] }>('/api/2fa/backup-codes', { method: 'POST', headers: sessionHeaders() });
}
