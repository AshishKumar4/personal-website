import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server, Subprocess } from 'bun';
import { SignJWT, exportJWK, generateKeyPair } from 'jose';
import * as OTPAuth from 'otpauth';
import type { ShareLink } from '@shared/types';

const RECOVERY_PASSWORD = 'share-links recovery passphrase';
const ACCESS_AUD = 'share-links-test';
const WEBM = crypto.getRandomValues(new Uint8Array(64 * 1024));
const PDF = new TextEncoder().encode('%PDF-1.7 signed lease');
const LINK_TTL_SECONDS = 1;

let dir = '';
let base = '';
let wrangler: Subprocess | undefined;
let jwks: Server<undefined> | undefined;
let accessJwt = '';
let session = '';

function freePort(): number {
  const probe = Bun.serve({ port: 0, fetch: () => new Response() });
  const port = probe.port;
  probe.stop(true);
  if (port === undefined) throw new Error('no free port');
  return port;
}

function call(path: string, { access = true, bearer = session, ...init }: RequestInit & { access?: boolean; bearer?: string } = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (access) headers.set('Cf-Access-Jwt-Assertion', accessJwt);
  if (bearer) headers.set('Authorization', `Bearer ${bearer}`);
  return fetch(`${base}${path}`, { ...init, headers, redirect: 'manual' });
}

async function data<T>(response: Promise<Response>): Promise<T> {
  const res = await response;
  const body: { success: boolean; data: T; error?: string } = await res.json();
  if (!res.ok || !body.success) throw new Error(`${res.status} ${body.error}`);
  return body.data;
}

function postJson(path: string, body: object, init: { access?: boolean; bearer?: string } = {}): Promise<Response> {
  return call(path, { ...init, method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

function upload(key: string, bytes: Uint8Array, type: string): Promise<unknown> {
  const form = new FormData();
  form.set('file', new File([bytes], key.split('/').pop() ?? key, { type }));
  form.set('key', key);
  return data(call('/api/files/upload', { method: 'POST', body: form }));
}

function share(key: string, ttlSeconds: number | null): Promise<ShareLink> {
  return data<ShareLink>(postJson('/api/shares', { key, ttlSeconds }));
}

function anonymous(path: string, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(`${base}${path}`, { headers, redirect: 'manual' });
}

async function fingerprint(res: Response): Promise<string> {
  const headers = [...res.headers].filter(([name]) => name !== 'date');
  return JSON.stringify([res.status, headers, await res.text()]);
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'share-links-'));
  const tls = Bun.spawnSync(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1',
    '-keyout', join(dir, 'key.pem'), '-out', join(dir, 'cert.pem')]);
  if (tls.exitCode !== 0) throw new Error(tls.stderr.toString());

  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const keys = [{ ...(await exportJWK(publicKey)), kid: 'test', alg: 'RS256', use: 'sig' }];
  jwks = Bun.serve({
    port: 0,
    tls: { cert: readFileSync(join(dir, 'cert.pem'), 'utf8'), key: readFileSync(join(dir, 'key.pem'), 'utf8') },
    fetch: () => Response.json({ keys }),
  });
  const teamDomain = `127.0.0.1:${jwks.port}`;
  accessJwt = await new SignJWT({ email: 'owner@example.com' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuer(`https://${teamDomain}`)
    .setAudience(ACCESS_AUD)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  const twoFactorKey = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
  writeFileSync(join(dir, '.env'), [
    `TWO_FACTOR_KEY=${twoFactorKey}`,
    `ADMIN_RECOVERY_PASSWORD=${RECOVERY_PASSWORD}`,
    `CF_ACCESS_TEAM_DOMAIN=${teamDomain}`,
    `CF_ACCESS_AUD=${ACCESS_AUD}`,
  ].join('\n'));

  const port = freePort();
  base = `http://127.0.0.1:${port}`;
  const proc = Bun.spawn([join(import.meta.dir, '../node_modules/.bin/wrangler'), 'dev',
    '--config', join(import.meta.dir, '../wrangler.jsonc'), '--assets', join(import.meta.dir, '../public'),
    '--ip', '127.0.0.1', '--port', String(port), '--inspector-port', String(freePort()),
    '--persist-to', join(dir, 'state'), '--env-file', join(dir, '.env'),
    '--show-interactive-dev-session=false'], {
    env: { ...process.env, NODE_EXTRA_CA_CERTS: join(dir, 'cert.pem'), WRANGLER_SEND_METRICS: 'false' },
    stdout: 'pipe',
    stderr: 'inherit',
  });
  wrangler = proc;
  const ready = Promise.withResolvers<void>();
  void (async () => {
    let output = '';
    for await (const chunk of proc.stdout) {
      output += new TextDecoder().decode(chunk);
      if (output.includes('Ready on')) ready.resolve();
    }
    ready.reject(new Error(`wrangler dev exited before it was ready:\n${output}`));
  })();
  await ready.promise;
}, 90_000);

afterAll(async () => {
  wrangler?.kill();
  await wrangler?.exited;
  jwks?.stop(true);
  rmSync(dir, { recursive: true, force: true });
});

describe('admin bootstrap', () => {
  test('a missing admin record rejects the old default password', async () => {
    const res = await postJson('/api/login', { username: 'admin', password: 'admin' }, { access: false });
    expect(res.status).toBe(401);
  });

  test('the recovery password creates the admin, which then enrols TOTP and gets a session', async () => {
    const step = await data<{ step: string; setupToken: string }>(postJson('/api/login', { username: 'admin', password: RECOVERY_PASSWORD }, { access: false }));
    expect(step.step).toBe('setup');
    const setup = await data<{ secret: string; flowToken: string }>(postJson('/api/2fa/totp/setup', { setupToken: step.setupToken }, { access: false }));
    const code = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(setup.secret) }).generate();
    const grant = await data<{ token: string }>(postJson('/api/2fa/totp/confirm', { flowToken: setup.flowToken, code }, { access: false }));
    session = grant.token;
    expect(session.length).toBeGreaterThan(0);
  });
});

describe('share links', () => {
  test('managing files and links needs both Cloudflare Access and the admin session', async () => {
    await upload('docs/screencast.webm', WEBM, 'video/webm');
    const apiToken = await data<{ token: string }>(postJson('/api/admin/api-tokens', { name: 'robot', ttlMinutes: 30 }, { access: false }));

    expect((await postJson('/api/shares', { key: 'docs/screencast.webm', ttlSeconds: null }, { access: false })).status).toBe(403);
    expect((await call('/api/files?prefix=docs/', { access: false })).status).toBe(403);
    expect((await postJson('/api/shares', { key: 'docs/screencast.webm', ttlSeconds: null }, { bearer: 'not-a-session' })).status).toBe(401);
    expect((await postJson('/api/shares', { key: 'docs/screencast.webm', ttlSeconds: null }, { bearer: apiToken.token })).status).toBe(401);
    expect((await call('/api/shares', { bearer: apiToken.token })).status).toBe(401);
  });

  test('a link streams the file anonymously, with byte ranges, until it is revoked', async () => {
    const link = await share('docs/screencast.webm', null);

    const full = await anonymous(`/s/${link.id}`);
    expect(full.status).toBe(200);
    expect(new Uint8Array(await full.arrayBuffer())).toEqual(WEBM);
    expect(Object.fromEntries(['content-type', 'content-length', 'accept-ranges', 'cache-control', 'x-robots-tag', 'referrer-policy'].map(h => [h, full.headers.get(h)]))).toEqual({
      'content-type': 'video/webm',
      'content-length': String(WEBM.length),
      'accept-ranges': 'bytes',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex',
      'referrer-policy': 'no-referrer',
    });
    expect(full.headers.get('content-disposition')).toStartWith('inline; filename="screencast.webm"');

    const middle = await anonymous(`/s/${link.id}`, { Range: 'bytes=1000-1999' });
    expect(middle.status).toBe(206);
    expect(middle.headers.get('content-range')).toBe(`bytes 1000-1999/${WEBM.length}`);
    expect(new Uint8Array(await middle.arrayBuffer())).toEqual(WEBM.slice(1000, 2000));

    const tail = await anonymous(`/s/${link.id}`, { Range: 'bytes=-16' });
    expect(tail.status).toBe(206);
    expect(new Uint8Array(await tail.arrayBuffer())).toEqual(WEBM.slice(-16));

    const resumed = await anonymous(`/s/${link.id}`, { Range: 'bytes=10-', 'If-Range': full.headers.get('etag') ?? '' });
    expect(resumed.status).toBe(206);
    expect(new Uint8Array(await resumed.arrayBuffer())).toEqual(WEBM.slice(10));
    expect((await anonymous(`/s/${link.id}`, { Range: 'bytes=10-', 'If-Range': '"changed"' })).status).toBe(200);
    expect((await anonymous(`/s/${link.id}`, { Range: `bytes=${WEBM.length}-` })).status).toBe(416);

    const listed = await data<{ items: ShareLink[] }>(call('/api/shares'));
    expect(listed.items).toContainEqual(link);

    await data(call(`/api/shares/${link.id}`, { method: 'DELETE' }));
    expect((await anonymous(`/s/${link.id}`)).status).toBe(404);
    expect((await data<{ items: ShareLink[] }>(call('/api/shares'))).items).not.toContainEqual(link);
  });

  test('revoked, expired and unknown links get the same 404', async () => {
    const revoked = await share('docs/screencast.webm', null);
    await data(call(`/api/shares/${revoked.id}`, { method: 'DELETE' }));
    const expiring = await share('docs/screencast.webm', LINK_TTL_SECONDS);
    expect((await anonymous(`/s/${expiring.id}`)).status).toBe(200);
    await Bun.sleep(LINK_TTL_SECONDS * 1000 + 100);

    const unknown = await fingerprint(await anonymous(`/s/${'A'.repeat(43)}`));
    expect(JSON.parse(unknown)[0]).toBe(404);
    expect(await fingerprint(await anonymous(`/s/${revoked.id}`))).toBe(unknown);
    expect(await fingerprint(await anonymous(`/s/${expiring.id}`))).toBe(unknown);
    expect(await fingerprint(await anonymous('/s/not-a-token'))).toBe(unknown);
  });

  test('overwriting or deleting a file revokes its links', async () => {
    const overwritten = await share('docs/screencast.webm', null);
    await upload('docs/screencast.webm', PDF, 'video/webm');
    expect((await anonymous(`/s/${overwritten.id}`)).status).toBe(404);

    await upload('docs/lease.pdf', PDF, 'application/pdf');
    const deleted = await share('docs/lease.pdf', null);
    expect((await anonymous(`/s/${deleted.id}`)).headers.get('content-type')).toBe('application/pdf');
    await data(call(`/api/files/${encodeURIComponent('docs/lease.pdf')}`, { method: 'DELETE' }));
    expect((await anonymous(`/s/${deleted.id}`)).status).toBe(404);

    await upload('trip/photos/a.png', PDF, 'image/png');
    const inFolder = await share('trip/photos/a.png', 3600);
    await data(call(`/api/files/folder/${encodeURIComponent('trip/')}`, { method: 'DELETE' }));
    expect((await anonymous(`/s/${inFolder.id}`)).status).toBe(404);

    const remaining = await data<{ items: { key: string }[] }>(call('/api/files?prefix=docs/'));
    expect(remaining.items.map(item => item.key)).toEqual(['docs/screencast.webm']);
    expect((await data<{ items: unknown[] }>(call('/api/files?prefix=trip/'))).items).toEqual([]);
    expect((await data<{ items: ShareLink[] }>(call('/api/shares'))).items).toEqual([]);
  });

  test('active content downloads instead of rendering on the site origin', async () => {
    await upload('page.html', new TextEncoder().encode('<script>alert(1)</script>'), 'text/html');
    const link = await share('page.html', null);
    const res = await anonymous(`/s/${link.id}`);
    expect(res.headers.get('content-disposition')).toStartWith('attachment;');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  test('files are never served by key without a link', async () => {
    for (const path of ['/docs/screencast.webm', '/api/files/docs%2Fscreencast.webm', '/api/images/docs/screencast.webm']) {
      const res = await anonymous(path);
      expect(new Uint8Array(await res.arrayBuffer())).not.toEqual(PDF);
    }
  });
});
