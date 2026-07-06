import { Hono } from "hono";
import type { Env } from './core-utils';
import { BlogEntity, AuthEntity, SiteConfigEntity, ExperienceEntity, ProjectEntity, ContactEntity, EmailEntity, EmailThreadEntity, EmailLabelEntity, EmailDraftEntity, EmailAddressEntity, BlockedSenderEntity, EmailFeedEntity, ApiTokenEntity, hashPasswordPBKDF2, hashPasswordLegacySHA256, generateSalt } from "./entities";
import { generateApiToken, parseApiToken, isApiTokenString, hashSecret, timingSafeEqualHex } from './api-token';
import * as twoFactor from './two-factor';
import { TwoFactorError, type TwoFactorEnv } from './two-factor';
import type { AuthUser } from '@shared/types';
import { ok, bad, notFound, isStr, mergeUnique } from './core-utils';
import type { BlogPost, SiteConfig, ChangePasswordPayload, Experience, Project, ContactMessage, Email, EmailThread, EmailLabel, EmailDraft, EmailAttachment, EmailAddress, EmailAddressKind, BlockedSender, EmailFeed, MailStats, ApiTokenPublic, ApiTokenCreated, R2FileItem, MultipartUploadPart } from "@shared/types";
import { EMAIL_DOMAIN, clampTtlMinutes } from "@shared/types";
import { getEmailRaw, getAttachment, generateThreadId } from './email-utils';
import { arrayBufferToBase64, isSafeMessageIdHeader, contentDispositionHeader } from './mail-encoding';
import { generateThrowawayLocalPart, getActiveFromAddress } from './address-utils';
import { normalizeLocalPart, validateLocalPart } from '@shared/address-validation';
import { createMimeMessage } from 'mimetext';
import { accessMiddleware } from './access-middleware';

interface ExtendedEnv extends Env {
  IMAGES_BUCKET?: R2Bucket;
  EMAIL_BUCKET?: R2Bucket;
  FILES_BUCKET?: R2Bucket;
  EMAIL_SENDER?: any;
}

function generateMessageId(): string {
  return `<${crypto.randomUUID()}@${EMAIL_DOMAIN}>`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isOwnDomainAddress(address: string): boolean {
  return address.toLowerCase().endsWith(`@${EMAIL_DOMAIN}`);
}

async function listAll<T>(page: (cursor?: string | null) => Promise<{ items: T[]; next: string | null }>): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null | undefined;
  do {
    const p = await page(cursor);
    items.push(...p.items);
    cursor = p.next;
  } while (cursor);
  return items;
}

function getAllEmails(env: Env): Promise<Email[]> {
  return listAll(cursor => EmailEntity.list(env, cursor));
}

interface SearchQuery {
  text: string[];
  from?: string;
  to?: string;
  subject?: string;
  hasAttachment?: boolean;
  unread?: boolean;
  starred?: boolean;
}

function parseSearchQuery(raw: string): SearchQuery {
  const query: SearchQuery = { text: [] };
  const tokens = raw.toLowerCase().match(/(\w+:"[^"]*"|\w+:\S+|"[^"]*"|\S+)/g) ?? [];
  for (const token of tokens) {
    const opMatch = token.match(/^(\w+):"?([^"]*)"?$/);
    if (opMatch) {
      const [, op, value] = opMatch;
      if (op === 'from') { query.from = value; continue; }
      if (op === 'to') { query.to = value; continue; }
      if (op === 'subject') { query.subject = value; continue; }
      if (op === 'has' && value === 'attachment') { query.hasAttachment = true; continue; }
      if (op === 'is') {
        if (value === 'unread') query.unread = true;
        else if (value === 'read') query.unread = false;
        else if (value === 'starred') query.starred = true;
        continue;
      }
    }
    query.text.push(token.replace(/^"|"$/g, ''));
  }
  return query;
}

function matchesSearch(e: Email, q: SearchQuery): boolean {
  if (q.from && !e.from.toLowerCase().includes(q.from)) return false;
  if (q.to && !e.to.some(t => t.toLowerCase().includes(q.to!))) return false;
  if (q.subject && !e.subject.toLowerCase().includes(q.subject)) return false;
  if (q.hasAttachment && e.attachments.length === 0) return false;
  if (q.unread !== undefined && e.read !== !q.unread) return false;
  if (q.starred && !e.starred) return false;
  if (q.text.length > 0) {
    const haystack = `${e.subject} ${e.from} ${e.snippet} ${e.textBody ?? ''}`.toLowerCase();
    if (!q.text.every(term => haystack.includes(term))) return false;
  }
  return true;
}

function getBearer(c: any): string | null {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

async function isValidSessionToken(c: any, token: string): Promise<boolean> {
  const adminUser = new AuthEntity(c.env, "admin");
  if (!(await adminUser.exists())) return false;
  const storedUser = await adminUser.getState();
  if (!storedUser.sessionToken || storedUser.sessionToken !== token) return false;
  if (!storedUser.tokenExpiry || Date.now() > storedUser.tokenExpiry) return false;
  return true;
}

async function isValidApiToken(c: any, token: string): Promise<boolean> {
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

const sessionAuthMiddleware = async (c: any, next: any) => {
  const token = getBearer(c);
  if (!token || !(await isValidSessionToken(c, token))) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }
  await next();
};

const adminAuthMiddleware = async (c: any, next: any) => {
  const token = getBearer(c);
  if (!token) return c.json({ success: false, error: 'Unauthorized' }, 401);
  const valid = isApiTokenString(token)
    ? await isValidApiToken(c, token)
    : await isValidSessionToken(c, token);
  if (!valid) return c.json({ success: false, error: 'Unauthorized' }, 401);
  await next();
};

async function hasValidSession(c: any): Promise<boolean> {
  const token = getBearer(c);
  return !!token && !isApiTokenString(token) && isValidSessionToken(c, token);
}

async function verifyAdminPassword(entity: AuthEntity, user: AuthUser, password: string): Promise<boolean> {
  if (user.salt) {
    return (await hashPasswordPBKDF2(password, user.salt)) === user.hashedPassword;
  }
  if ((await hashPasswordLegacySHA256(password)) === user.hashedPassword) {
    const salt = generateSalt();
    const hashedPassword = await hashPasswordPBKDF2(password, salt);
    await entity.mutate(s => ({ ...s, salt, hashedPassword }));
    return true;
  }
  return false;
}

async function run2FA(c: any, fn: () => Promise<unknown>) {
  try {
    return ok(c, await fn());
  } catch (err) {
    if (err instanceof TwoFactorError) return c.json({ success: false, error: err.message }, err.status as any);
    console.error('2FA error:', err);
    return c.json({ success: false, error: 'Two-factor operation failed' }, 500);
  }
}
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/test', (c) => c.json({ success: true, data: { name: 'CF Workers Demo' }}));
  // AUTH
  app.post('/api/login', async (c) => {
    await AuthEntity.seedData(c.env);
    const { username, password } = await c.req.json();
    if (!isStr(username) || !isStr(password)) return bad(c, 'username and password required');
    if (username !== 'admin') return c.json({ success: false, error: 'Invalid credentials' }, 401);
    const user = new AuthEntity(c.env, 'admin');
    if (!await user.exists()) return notFound(c, 'user not found');

    if (await twoFactor.isLocked(c.env)) {
      return c.json({ success: false, error: 'Too many attempts. Try again later.' }, 429);
    }

    if (!(await verifyAdminPassword(user, await user.getState(), password))) {
      await twoFactor.recordFailure(c.env);
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }
    return ok(c, await twoFactor.beginAfterPassword(c.env));
  });

  // ---- 2FA: login second factor (authorized by challengeToken) ----
  app.post('/api/2fa/login/totp', (c) => run2FA(c, async () => {
    const { challengeToken, code } = await c.req.json();
    if (!isStr(challengeToken) || !isStr(code)) throw new TwoFactorError(400, 'challengeToken and code required');
    return twoFactor.loginTotp(c.env as TwoFactorEnv, challengeToken, code);
  }));
  app.post('/api/2fa/login/backup', (c) => run2FA(c, async () => {
    const { challengeToken, code } = await c.req.json();
    if (!isStr(challengeToken) || !isStr(code)) throw new TwoFactorError(400, 'challengeToken and code required');
    return twoFactor.loginBackup(c.env, challengeToken, code);
  }));
  app.post('/api/2fa/login/passkey/options', (c) => run2FA(c, async () => {
    const { challengeToken } = await c.req.json();
    if (!isStr(challengeToken)) throw new TwoFactorError(400, 'challengeToken required');
    return twoFactor.loginPasskeyOptions(c.env, c.req.header('Origin'), challengeToken);
  }));
  app.post('/api/2fa/login/passkey', (c) => run2FA(c, async () => {
    const { challengeToken, response } = await c.req.json();
    if (!isStr(challengeToken) || !response) throw new TwoFactorError(400, 'challengeToken and response required');
    return twoFactor.loginPasskey(c.env, c.req.header('Origin'), challengeToken, response);
  }));

  // ---- 2FA: enrollment / management (setupToken OR session) ----
  app.post('/api/2fa/totp/setup', (c) => run2FA(c, async () => {
    const { setupToken } = await c.req.json().catch(() => ({}));
    return twoFactor.totpSetup(c.env as TwoFactorEnv, isStr(setupToken) ? setupToken : undefined, await hasValidSession(c));
  }));
  app.post('/api/2fa/totp/confirm', (c) => run2FA(c, async () => {
    const { flowToken, code } = await c.req.json();
    if (!isStr(flowToken) || !isStr(code)) throw new TwoFactorError(400, 'flowToken and code required');
    return twoFactor.totpConfirm(c.env as TwoFactorEnv, flowToken, code);
  }));
  app.post('/api/2fa/passkey/register/options', (c) => run2FA(c, async () => {
    const { setupToken } = await c.req.json().catch(() => ({}));
    return twoFactor.passkeyRegisterOptions(c.env, c.req.header('Origin'), isStr(setupToken) ? setupToken : undefined, await hasValidSession(c));
  }));
  app.post('/api/2fa/passkey/register', (c) => run2FA(c, async () => {
    const { flowToken, response, name } = await c.req.json();
    if (!isStr(flowToken) || !response) throw new TwoFactorError(400, 'flowToken and response required');
    return twoFactor.passkeyRegister(c.env, c.req.header('Origin'), flowToken, response, isStr(name) ? name : 'Passkey');
  }));

  // ---- 2FA: management (session-only) ----
  app.get('/api/2fa/status', sessionAuthMiddleware, (c) => run2FA(c, () => twoFactor.getStatus(c.env)));
  app.delete('/api/2fa/passkey/:id', sessionAuthMiddleware, (c) => run2FA(c, () => twoFactor.removePasskey(c.env, c.req.param('id'))));
  app.delete('/api/2fa/totp', sessionAuthMiddleware, (c) => run2FA(c, () => twoFactor.disableTotp(c.env)));
  app.post('/api/2fa/backup-codes', sessionAuthMiddleware, (c) => run2FA(c, async () => ({ codes: await twoFactor.regenerateBackupCodes(c.env) })));

  app.post('/api/logout', sessionAuthMiddleware, async (c) => {
    const adminUser = new AuthEntity(c.env, "admin");
    await adminUser.mutate(s => ({ ...s, sessionToken: "", tokenExpiry: 0 }));
    return ok(c, { message: 'Logged out successfully' });
  });
  app.post('/api/admin/change-password', sessionAuthMiddleware, async (c) => {
    const { currentPassword, newPassword } = await c.req.json() as Partial<ChangePasswordPayload>;
    if (!isStr(currentPassword) || !isStr(newPassword)) {
      return bad(c, 'Current and new passwords are required');
    }
    if (newPassword.length < 6) {
      return bad(c, 'New password must be at least 6 characters long');
    }
    const adminUser = new AuthEntity(c.env, "admin");
    if (!(await adminUser.exists())) {
      return notFound(c, 'Admin user not found');
    }
    if (!(await verifyAdminPassword(adminUser, await adminUser.getState(), currentPassword))) {
      return c.json({ success: false, error: 'Invalid current password' }, 401);
    }
    const newSalt = generateSalt();
    const newPasswordHashed = await hashPasswordPBKDF2(newPassword, newSalt);
    await adminUser.mutate(u => ({ ...u, salt: newSalt, hashedPassword: newPasswordHashed }));
    const token = await twoFactor.issueSession(c.env);
    return ok(c, { message: 'Password updated successfully', token });
  });
  const toPublicToken = (r: ApiTokenPublic): ApiTokenPublic => ({
    id: r.id, name: r.name, createdAt: r.createdAt, expiresAt: r.expiresAt, lastUsedAt: r.lastUsedAt,
  });

  app.get('/api/admin/api-tokens', sessionAuthMiddleware, async (c) => {
    const all = await listAll(cursor => ApiTokenEntity.list(c.env, cursor));
    const now = Date.now();
    const expired = all.filter(t => t.expiresAt <= now);
    if (expired.length > 0) {
      await ApiTokenEntity.deleteMany(c.env, expired.map(t => t.id));
    }
    const active = all
      .filter(t => t.expiresAt > now)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(toPublicToken);
    return ok(c, { items: active });
  });

  app.post('/api/admin/api-tokens', sessionAuthMiddleware, async (c) => {
    const { name, ttlMinutes } = await c.req.json() as { name?: string; ttlMinutes?: number };
    const minutes = clampTtlMinutes(Number(ttlMinutes));
    const now = Date.now();
    const { keyId, secret, token } = generateApiToken();
    const record = {
      id: keyId,
      name: isStr(name) ? name.trim().slice(0, 80) : 'Untitled token',
      secretHash: await hashSecret(secret),
      createdAt: now,
      expiresAt: now + minutes * 60 * 1000,
      lastUsedAt: 0,
    };
    await ApiTokenEntity.create(c.env, record);
    const created: ApiTokenCreated = { ...toPublicToken(record), token };
    return ok(c, created);
  });

  app.delete('/api/admin/api-tokens/:id', sessionAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    if (!await new ApiTokenEntity(c.env, id).exists()) return notFound(c, 'Token not found');
    const deleted = await ApiTokenEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });
  // SITE CONFIG
  app.get('/api/config', async (c) => {
    await SiteConfigEntity.seedData(c.env);
    const config = new SiteConfigEntity(c.env, "main");
    // Configs saved before aboutStory existed lack the field; normalize here.
    return ok(c, { ...SiteConfigEntity.initialState, ...(await config.getState()) });
  });
  app.put('/api/config', adminAuthMiddleware, async (c) => {
    const { subtitle, bio, about, aboutStory, backgroundEffect } = await c.req.json() as Partial<SiteConfig>;
    if (!isStr(subtitle) || !isStr(bio) || !isStr(about)) return bad(c, 'subtitle, bio, and about are required');
    if (!isStr(backgroundEffect) || !['grid', 'particles', 'aurora', 'vortex', 'matrix', 'neural'].includes(backgroundEffect)) {
      return bad(c, 'A valid background effect is required.');
    }
    const config = new SiteConfigEntity(c.env, "main");
    const current = await config.getState();
    await config.save({ subtitle, bio, about, aboutStory: isStr(aboutStory) ? aboutStory : (current.aboutStory ?? ''), backgroundEffect });
    return ok(c, await config.getState());
  });
  // BLOG POSTS (Public)
  app.get('/api/posts', async (c) => {
    await BlogEntity.ensureSeed(c.env);
    const page = await BlogEntity.list(c.env);
    page.items.sort((a, b) => b.createdAt - a.createdAt);
    return ok(c, page);
  });
  app.get('/api/posts/:slug', async (c) => {
    const slug = c.req.param('slug');
    const post = new BlogEntity(c.env, slug);
    if (!await post.exists()) return notFound(c, 'post not found');
    return ok(c, await post.getState());
  });
  // BLOG POSTS (Protected Admin Routes)
  app.post('/api/posts', adminAuthMiddleware, async (c) => {
    const { title, content, author, format, featured, createdAt } = await c.req.json() as Partial<BlogPost>;
    if (!isStr(title) || !isStr(content) || !isStr(author)) return bad(c, 'title, content, and author required');
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    const newPost: BlogPost = {
      id: slug, slug, title, content, author,
      createdAt: typeof createdAt === 'number' ? createdAt : Date.now(),
      format: format === 'notebook' ? 'notebook' : 'markdown',
      featured: featured === true,
    };
    const postEntity = new BlogEntity(c.env, slug);
    if (await postEntity.exists()) return bad(c, 'a post with this slug already exists');
    const created = await BlogEntity.create(c.env, newPost);
    return ok(c, created);
  });
  app.put('/api/posts/:slug', adminAuthMiddleware, async (c) => {
    const slug = c.req.param('slug');
    const { title, content, featured, createdAt } = await c.req.json() as Partial<BlogPost>;
    const post = new BlogEntity(c.env, slug);
    if (!await post.exists()) return notFound(c, 'post not found');
    const updated = await post.mutate(s => ({
      ...s,
      ...(isStr(title) ? { title } : {}),
      ...(isStr(content) ? { content } : {}),
      ...(typeof featured === 'boolean' ? { featured } : {}),
      ...(typeof createdAt === 'number' ? { createdAt } : {}),
    }));
    return ok(c, updated);
  });
  app.delete('/api/posts/:slug', adminAuthMiddleware, async (c) => {
    const slug = c.req.param('slug');
    const deleted = await BlogEntity.delete(c.env, slug);
    return ok(c, { slug, deleted });
  });
  // EXPERIENCE (Public)
  app.get('/api/experiences', async (c) => {
    await ExperienceEntity.ensureSeed(c.env);
    const page = await ExperienceEntity.list(c.env);
    return ok(c, page);
  });
  // EXPERIENCE (Protected Admin Routes)
  app.post('/api/experiences', adminAuthMiddleware, async (c) => {
    const body = await c.req.json() as Partial<Experience>;
    const newExperience: Experience = {
      id: crypto.randomUUID(),
      company: body.company || '',
      logoUrl: body.logoUrl || '',
      role: body.role || '',
      duration: body.duration || '',
      location: body.location || '',
      description: body.description || '',
      skills: body.skills || [],
      ...(typeof body.order === 'number' ? { order: body.order } : {}),
    };
    const created = await ExperienceEntity.create(c.env, newExperience);
    return ok(c, created);
  });
  app.put('/api/experiences/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json() as Partial<Experience>;
    const exp = new ExperienceEntity(c.env, id);
    if (!await exp.exists()) return notFound(c, 'experience not found');
    const updated = await exp.mutate(s => ({ ...s, ...body, id: s.id }));
    return ok(c, updated);
  });
  app.delete('/api/experiences/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const deleted = await ExperienceEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });
  // PROJECTS (Public)
  app.get('/api/projects', async (c) => {
    await ProjectEntity.ensureSeed(c.env);
    const page = await ProjectEntity.list(c.env);
    return ok(c, page);
  });
  // PROJECTS (Protected Admin Routes)
  app.post('/api/projects', adminAuthMiddleware, async (c) => {
    const body = await c.req.json() as Partial<Project>;
    const newProject: Project = {
      id: body.name?.toLowerCase().replace(/\s+/g, '-') || crypto.randomUUID(),
      name: body.name || '',
      description: body.description || '',
      repo: body.repo || '',
      url: body.url || '',
      ...(body.imageUrl ? { imageUrl: body.imageUrl } : {}),
    };
    const created = await ProjectEntity.create(c.env, newProject);
    return ok(c, created);
  });
  app.put('/api/projects/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json() as Partial<Project>;
    const proj = new ProjectEntity(c.env, id);
    if (!await proj.exists()) return notFound(c, 'project not found');
    const updated = await proj.mutate(s => ({ ...s, ...body, id: s.id }));
    return ok(c, updated);
  });
  app.delete('/api/projects/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const deleted = await ProjectEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });

  // IMAGE UPLOAD
  app.post('/api/upload', adminAuthMiddleware, async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.IMAGES_BUCKET) {
      return bad(c, 'Image upload not configured. Please set up R2 bucket.');
    }

    try {
      const formData = await c.req.formData();
      const file = formData.get('file');

      if (!file || !(file instanceof File)) {
        return bad(c, 'No file provided');
      }

      if (!file.type.startsWith('image/')) {
        return bad(c, 'Only image files are allowed');
      }

      if (file.size > 10 * 1024 * 1024) {
        return bad(c, 'File size must be less than 10MB');
      }

      const ext = file.name.split('.').pop() || 'jpg';
      const key = `images/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      await env.IMAGES_BUCKET.put(key, file.stream(), {
        httpMetadata: {
          contentType: file.type,
        },
      });

      const url = `/api/images/${key}`;
      return ok(c, { url, key });
    } catch (error: any) {
      console.error('Upload error:', error);
      return bad(c, 'Failed to upload image');
    }
  });

  // SERVE IMAGES
  app.get('/api/images/*', async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.IMAGES_BUCKET) {
      return c.notFound();
    }

    const key = c.req.path.replace('/api/images/', '');
    const object = await env.IMAGES_BUCKET.get(key);

    if (!object) {
      return c.notFound();
    }

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
    headers.set('Cache-Control', 'public, max-age=31536000');

    return new Response(object.body, { headers });
  });

  // CONTACT FORM (Public)
  app.post('/api/contact', async (c) => {
    const { name, email, message } = await c.req.json() as Partial<ContactMessage>;
    if (!isStr(name) || !isStr(email) || !isStr(message)) {
      return bad(c, 'name, email, and message are required');
    }
    if (!email.includes('@') || !email.includes('.')) {
      return bad(c, 'Invalid email format');
    }
    if (message.length > 5000) {
      return bad(c, 'Message too long (max 5000 characters)');
    }
    const newMessage: ContactMessage = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      createdAt: Date.now(),
    };
    await ContactEntity.create(c.env, newMessage);
    return ok(c, { message: 'Message sent successfully' });
  });

  // CONTACT MESSAGES (Admin only)
  app.get('/api/contacts', adminAuthMiddleware, async (c) => {
    const page = await ContactEntity.list(c.env);
    page.items.sort((a, b) => b.createdAt - a.createdAt);
    return ok(c, page);
  });

  app.delete('/api/contacts/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const deleted = await ContactEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });

  // ============ EMAIL SYSTEM ROUTES ============
  // Protected by Cloudflare Zero Trust Access JWT validation
  app.use('/api/mail/*', accessMiddleware);

  // Email addresses (dynamic handles)
  app.get('/api/mail/addresses', async (c) => {
    await EmailAddressEntity.ensureSeed(c.env);
    const items = await listAll(cursor => EmailAddressEntity.list(c.env, cursor));
    items.sort((a, b) => {
      if ((a.kind === 'primary') !== (b.kind === 'primary')) return a.kind === 'primary' ? -1 : 1;
      return b.createdAt - a.createdAt;
    });
    return ok(c, { items });
  });

  app.post('/api/mail/addresses', async (c) => {
    await EmailAddressEntity.ensureSeed(c.env);
    const { kind, localPart, name, note } = await c.req.json() as { kind?: EmailAddressKind; localPart?: string; name?: string; note?: string };
    if (kind !== 'custom' && kind !== 'throwaway') return bad(c, 'kind must be custom or throwaway');

    let id: string;
    if (kind === 'throwaway') {
      if (localPart !== undefined) return bad(c, 'Throwaway addresses are generated automatically');
      id = await generateThrowawayLocalPart(c.env);
    } else {
      if (!isStr(localPart)) return bad(c, 'localPart is required');
      id = normalizeLocalPart(localPart);
      const error = validateLocalPart(id);
      if (error) return bad(c, error);
      if (await new EmailAddressEntity(c.env, id).exists()) return bad(c, 'Address already exists');
    }

    const created = await EmailAddressEntity.create(c.env, {
      id,
      address: `${id}@${EMAIL_DOMAIN}`,
      name: name?.trim() || id,
      kind,
      status: 'active',
      note: note?.trim() || undefined,
      createdAt: Date.now(),
    });
    return ok(c, created);
  });

  app.put('/api/mail/addresses/:id', async (c) => {
    const id = c.req.param('id');
    const { name, note, status } = await c.req.json() as Partial<Pick<EmailAddress, 'name' | 'note' | 'status'>>;
    const entity = new EmailAddressEntity(c.env, id);
    if (!await entity.exists()) return notFound(c, 'Address not found');
    if (status !== undefined && status !== 'active' && status !== 'suppressed') {
      return bad(c, 'status must be active or suppressed');
    }
    const state = await entity.getState();
    if (status === 'suppressed' && state.kind === 'primary') {
      return bad(c, 'Primary addresses cannot be suppressed');
    }
    const updated = await entity.mutate(a => ({
      ...a,
      name: name !== undefined && isStr(name) && name.trim() ? name.trim() : a.name,
      note: note !== undefined ? (note.trim() || undefined) : a.note,
      status: status ?? a.status,
    }));
    return ok(c, updated);
  });

  app.delete('/api/mail/addresses/:id', async (c) => {
    const id = c.req.param('id');
    const entity = new EmailAddressEntity(c.env, id);
    if (!await entity.exists()) return notFound(c, 'Address not found');
    const state = await entity.getState();
    if (state.kind === 'primary') return bad(c, 'Primary addresses cannot be deleted');
    const deleted = await EmailAddressEntity.delete(c.env, id);
    const feeds = await listAll(cursor => EmailFeedEntity.list(c.env, cursor));
    for (const feed of feeds) {
      if (feed.accountIds.includes(id)) {
        await new EmailFeedEntity(c.env, feed.id).mutate(f => ({
          ...f,
          accountIds: f.accountIds.filter(a => a !== id),
        }));
      }
    }
    return ok(c, { id, deleted });
  });

  // Blocked senders
  app.get('/api/mail/blocked-senders', async (c) => {
    const items = await listAll(cursor => BlockedSenderEntity.list(c.env, cursor));
    items.sort((a, b) => b.createdAt - a.createdAt);
    return ok(c, { items });
  });

  app.post('/api/mail/blocked-senders', async (c) => {
    const { address, reason } = await c.req.json() as { address?: string; reason?: string };
    if (!isStr(address)) return bad(c, 'address is required');
    const id = address.trim().toLowerCase();
    if (!isValidEmail(id)) return bad(c, 'Invalid email address');
    if (isOwnDomainAddress(id)) return bad(c, 'Cannot block your own domain; suppress the address instead');
    if (await new BlockedSenderEntity(c.env, id).exists()) return bad(c, 'Sender already blocked');
    const created = await BlockedSenderEntity.create(c.env, {
      id,
      address: id,
      reason: reason?.trim() || undefined,
      createdAt: Date.now(),
    });
    return ok(c, created);
  });

  app.delete('/api/mail/blocked-senders/:address', async (c) => {
    const id = decodeURIComponent(c.req.param('address')).toLowerCase();
    if (!await new BlockedSenderEntity(c.env, id).exists()) return notFound(c, 'Sender not blocked');
    const deleted = await BlockedSenderEntity.delete(c.env, id);
    return ok(c, { address: id, deleted });
  });

  // Feeds (virtual inboxes)
  app.get('/api/mail/feeds', async (c) => {
    const items = await listAll(cursor => EmailFeedEntity.list(c.env, cursor));
    items.sort((a, b) => a.createdAt - b.createdAt);
    return ok(c, { items });
  });

  const validateFeedInput = async (
    env: Env,
    body: Partial<Pick<EmailFeed, 'name' | 'color' | 'accountIds' | 'senders'>>
  ): Promise<string | null> => {
    if (body.accountIds !== undefined) {
      if (!Array.isArray(body.accountIds) || body.accountIds.length > 100) return 'accountIds must be an array of at most 100 ids';
      for (const accountId of body.accountIds) {
        if (!isStr(accountId) || !(await new EmailAddressEntity(env, accountId).exists())) {
          return `Unknown address: ${accountId}`;
        }
      }
    }
    if (body.senders !== undefined) {
      if (!Array.isArray(body.senders) || body.senders.length > 100) return 'senders must be an array of at most 100 addresses';
      for (const sender of body.senders) {
        if (!isStr(sender) || !isValidEmail(sender.trim())) return `Invalid sender address: ${sender}`;
      }
    }
    return null;
  };

  app.post('/api/mail/feeds', async (c) => {
    const body = await c.req.json() as Partial<Pick<EmailFeed, 'name' | 'color' | 'accountIds' | 'senders'>>;
    if (!isStr(body.name)) return bad(c, 'name is required');
    const error = await validateFeedInput(c.env, body);
    if (error) return bad(c, error);
    const created = await EmailFeedEntity.create(c.env, {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      color: body.color?.trim() || '',
      accountIds: body.accountIds ?? [],
      senders: (body.senders ?? []).map(s => s.trim().toLowerCase()),
      createdAt: Date.now(),
    });
    return ok(c, created);
  });

  app.put('/api/mail/feeds/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json() as Partial<Pick<EmailFeed, 'name' | 'color' | 'accountIds' | 'senders'>>;
    const entity = new EmailFeedEntity(c.env, id);
    if (!await entity.exists()) return notFound(c, 'Feed not found');
    if (body.name !== undefined && !isStr(body.name)) return bad(c, 'name cannot be empty');
    const error = await validateFeedInput(c.env, body);
    if (error) return bad(c, error);
    const updated = await entity.mutate(f => ({
      ...f,
      name: body.name !== undefined ? body.name.trim() : f.name,
      color: body.color !== undefined ? body.color.trim() : f.color,
      accountIds: body.accountIds ?? f.accountIds,
      senders: body.senders !== undefined ? body.senders.map(s => s.trim().toLowerCase()) : f.senders,
    }));
    return ok(c, updated);
  });

  app.delete('/api/mail/feeds/:id', async (c) => {
    const id = c.req.param('id');
    if (!await new EmailFeedEntity(c.env, id).exists()) return notFound(c, 'Feed not found');
    const deleted = await EmailFeedEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });

  // Unread stats for sidebar badges
  app.get('/api/mail/stats', async (c) => {
    const threads = await listAll(cursor => EmailThreadEntity.list(c.env, cursor));
    const stats: MailStats = { accounts: {}, labels: {} };
    for (const thread of threads) {
      if (thread.read) continue;
      if (thread.labels.includes('inbox')) {
        stats.accounts[thread.account] = (stats.accounts[thread.account] ?? 0) + 1;
      }
      for (const label of thread.labels) {
        stats.labels[label] = (stats.labels[label] ?? 0) + 1;
      }
    }
    return ok(c, stats);
  });

  // Get all labels
  app.get('/api/mail/labels', async (c) => {
    await EmailLabelEntity.ensureSeed(c.env);
    const page = await EmailLabelEntity.list(c.env);
    return ok(c, page);
  });

  // Create custom label
  app.post('/api/mail/labels', async (c) => {
    const { name, color } = await c.req.json();
    if (!isStr(name)) return bad(c, 'Label name is required');
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const label: EmailLabel = { id, name, color, type: 'user' };
    const created = await EmailLabelEntity.create(c.env, label);
    return ok(c, created);
  });

  // Delete custom label
  app.delete('/api/mail/labels/:id', async (c) => {
    const id = c.req.param('id');
    const label = new EmailLabelEntity(c.env, id);
    if (!await label.exists()) return notFound(c, 'Label not found');
    const state = await label.getState();
    if (state.type === 'system') return bad(c, 'Cannot delete system labels');
    const deleted = await EmailLabelEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });

  // List threads (inbox view)
  app.get('/api/mail/threads', async (c) => {
    const account = c.req.query('account');
    const feedId = c.req.query('feed');
    const label = c.req.query('label') || 'inbox';
    if (account && feedId) return bad(c, 'account and feed are mutually exclusive');

    let threads = await listAll(cursor => EmailThreadEntity.list(c.env, cursor));
    if (feedId) {
      const feedEntity = new EmailFeedEntity(c.env, feedId);
      if (!await feedEntity.exists()) return notFound(c, 'Feed not found');
      const feed = await feedEntity.getState();
      const accountSet = new Set(feed.accountIds);
      const senderSet = new Set(feed.senders);
      threads = threads.filter(t =>
        accountSet.has(t.account) || t.participants.some(p => senderSet.has(p.toLowerCase()))
      );
    } else if (account) {
      threads = threads.filter(t => t.account === account);
    }
    if (label === 'all' && !feedId) {
      // "All Mail" — everything except trash and spam.
      threads = threads.filter(t => !t.labels.includes('trash') && !t.labels.includes('spam'));
    } else if (label !== 'all') {
      threads = threads.filter(t => t.labels.includes(label));
    }
    threads.sort((a, b) => b.lastEmailAt - a.lastEmailAt);

    return ok(c, { items: threads });
  });

  // Get single thread with all emails
  app.get('/api/mail/threads/:id', async (c) => {
    const id = c.req.param('id');
    const thread = new EmailThreadEntity(c.env, id);
    if (!await thread.exists()) return notFound(c, 'Thread not found');
    const threadState = await thread.getState();
    const allEmails = await getAllEmails(c.env);
    const emails = allEmails
      .filter(e => e.threadId === id)
      .sort((a, b) => a.createdAt - b.createdAt);
    return ok(c, { thread: threadState, emails });
  });

  // Update thread (mark read, star, labels)
  app.put('/api/mail/threads/:id', async (c) => {
    const id = c.req.param('id');
    const { read, starred, labels } = await c.req.json();
    const thread = new EmailThreadEntity(c.env, id);
    if (!await thread.exists()) return notFound(c, 'Thread not found');
    const updated = await thread.mutate(t => ({
      ...t,
      read: read !== undefined ? read : t.read,
      starred: starred !== undefined ? starred : t.starred,
      labels: labels !== undefined ? labels : t.labels,
    }));
    if (read !== undefined) {
      const allEmails = await getAllEmails(c.env);
      const emails = allEmails.filter(e => e.threadId === id);
      for (const email of emails) {
        const emailEntity = new EmailEntity(c.env, email.id);
        await emailEntity.mutate(e => ({ ...e, read }));
      }
    }
    return ok(c, updated);
  });

  // Mark thread as spam and optionally block its senders
  app.post('/api/mail/threads/:id/spam', async (c) => {
    const id = c.req.param('id');
    const { blockSenders = true } = await c.req.json().catch(() => ({})) as { blockSenders?: boolean };
    const thread = new EmailThreadEntity(c.env, id);
    if (!await thread.exists()) return notFound(c, 'Thread not found');

    const toSpamLabels = (labels: string[]) => mergeUnique(labels.filter(l => l !== 'inbox'), ['spam']);
    const updated = await thread.mutate(t => ({ ...t, labels: toSpamLabels(t.labels) }));

    const allEmails = await getAllEmails(c.env);
    for (const email of allEmails.filter(e => e.threadId === id)) {
      await new EmailEntity(c.env, email.id).mutate(e => ({ ...e, labels: toSpamLabels(e.labels) }));
    }

    const blockedSenders: string[] = [];
    if (blockSenders) {
      const now = Date.now();
      for (const participant of updated.participants) {
        const address = participant.toLowerCase();
        if (!isValidEmail(address) || isOwnDomainAddress(address)) continue;
        if (await new BlockedSenderEntity(c.env, address).exists()) continue;
        await BlockedSenderEntity.create(c.env, { id: address, address, createdAt: now });
        blockedSenders.push(address);
      }
    }
    return ok(c, { id, spam: true, blockedSenders });
  });

  // Trash thread
  app.delete('/api/mail/threads/:id', async (c) => {
    const id = c.req.param('id');
    const thread = new EmailThreadEntity(c.env, id);
    if (!await thread.exists()) return notFound(c, 'Thread not found');
    await thread.mutate(t => ({
      ...t,
      labels: t.labels.filter(l => l !== 'inbox').concat(['trash']),
    }));
    return ok(c, { id, trashed: true });
  });

  // Get single email
  app.get('/api/mail/emails/:id', async (c) => {
    const id = c.req.param('id');
    const email = new EmailEntity(c.env, id);
    if (!await email.exists()) return notFound(c, 'Email not found');
    return ok(c, await email.getState());
  });

  // Get raw email
  app.get('/api/mail/emails/:id/raw', async (c) => {
    const id = c.req.param('id');
    const email = new EmailEntity(c.env, id);
    if (!await email.exists()) return notFound(c, 'Email not found');
    const state = await email.getState();
    const raw = await getEmailRaw(c.env as ExtendedEnv, state.rawKey);
    if (!raw) return notFound(c, 'Raw email not found');
    return new Response(raw, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  });

  // Update email (star, labels)
  app.put('/api/mail/emails/:id', async (c) => {
    const id = c.req.param('id');
    const { read, starred, labels } = await c.req.json();
    const email = new EmailEntity(c.env, id);
    if (!await email.exists()) return notFound(c, 'Email not found');
    const updated = await email.mutate(e => ({
      ...e,
      read: read !== undefined ? read : e.read,
      starred: starred !== undefined ? starred : e.starred,
      labels: labels !== undefined ? labels : e.labels,
    }));
    return ok(c, updated);
  });

  // Get attachment
  app.get('/api/mail/attachments/:emailId/:attachmentId', async (c) => {
    const { emailId, attachmentId } = c.req.param();
    const email = new EmailEntity(c.env, emailId);
    if (!await email.exists()) return notFound(c, 'Email not found');
    const state = await email.getState();
    const attachment = state.attachments.find(a => a.id === attachmentId);
    if (!attachment) return notFound(c, 'Attachment not found');
    const data = await getAttachment(c.env as ExtendedEnv, attachment.r2Key);
    if (!data) return notFound(c, 'Attachment data not found');
    const disposition = attachment.disposition === 'inline' ? 'inline' : 'attachment';
    return new Response(data.data, {
      headers: {
        'Content-Type': data.contentType,
        'Content-Disposition': contentDispositionHeader(disposition, attachment.filename),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  });

  // Send new email
  app.post('/api/mail/send', async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.EMAIL_SENDER) return bad(c, 'Email sending not configured');

    const formData = await c.req.formData();
    const from = formData.get('from') as string;
    const to = formData.get('to') as string;
    const cc = formData.get('cc') as string | null;
    const bcc = formData.get('bcc') as string | null;
    const subject = formData.get('subject') as string;
    const body = formData.get('body') as string;
    const htmlBody = formData.get('html') as string | null;
    const inReplyTo = formData.get('inReplyTo') as string | null;
    const existingThreadId = formData.get('threadId') as string | null;
    const attachmentFiles = formData.getAll('attachments') as File[];

    if (!from || !to || !subject) {
      return bad(c, 'from, to, and subject are required');
    }

    const sender = await getActiveFromAddress(c.env, from);
    if (!sender) {
      return bad(c, 'Invalid sender address');
    }

    const toList = to.split(',').map(a => a.trim()).filter(Boolean);
    if (toList.some(addr => !isValidEmail(addr))) {
      return bad(c, 'Invalid recipient email address');
    }

    try {
      const messageId = generateMessageId();
      const msg = createMimeMessage();
      msg.setSender({ addr: sender.address, name: sender.name });
      toList.forEach((addr: string) => msg.setRecipient(addr));
      if (cc) {
        const ccAddrs = cc.split(',').map(a => a.trim()).filter(Boolean);
        for (const addr of ccAddrs) {
          if (!isValidEmail(addr)) {
            return bad(c, `Invalid CC address: ${addr}`);
          }
          msg.setCc(addr);
        }
      }
      if (bcc) {
        const bccAddrs = bcc.split(',').map(a => a.trim()).filter(Boolean);
        for (const addr of bccAddrs) {
          if (!isValidEmail(addr)) {
            return bad(c, `Invalid BCC address: ${addr}`);
          }
          msg.setBcc(addr);
        }
      }
      msg.setSubject(subject);
      msg.setHeader('Message-ID', messageId);
      if (inReplyTo && isSafeMessageIdHeader(inReplyTo)) {
        msg.setHeader('In-Reply-To', inReplyTo);
        msg.setHeader('References', inReplyTo);
      }
      if (body) {
        msg.addMessage({ contentType: 'text/plain', data: body });
      }
      if (htmlBody) {
        msg.addMessage({ contentType: 'text/html', data: htmlBody });
      }

      const attachmentContents: { file: File; content: ArrayBuffer }[] = [];
      for (const file of attachmentFiles) {
        if (file && file.size > 0) {
          attachmentContents.push({ file, content: await file.arrayBuffer() });
        }
      }

      for (const { file, content } of attachmentContents) {
        msg.addAttachment({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          data: arrayBufferToBase64(content),
        });
      }

      const { EmailMessage } = await import('cloudflare:email');
      const emailMsg = new EmailMessage(sender.address, toList[0], msg.asRaw());
      await env.EMAIL_SENDER.send(emailMsg);

      const account = sender.id;
      const ccList = cc ? cc.split(',').map(a => a.trim()).filter(Boolean) : undefined;
      const bccList = bcc ? bcc.split(',').map(a => a.trim()).filter(Boolean) : undefined;
      const now = Date.now();
      const emailId = crypto.randomUUID();

      const attachments: EmailAttachment[] = [];
      if (env.EMAIL_BUCKET) {
        for (const { file, content } of attachmentContents) {
          const attId = crypto.randomUUID();
          const attKey = `emails/${account}/${emailId}/attachments/${attId}`;
          await env.EMAIL_BUCKET.put(attKey, content, {
            httpMetadata: { contentType: file.type || 'application/octet-stream' },
          });
          attachments.push({
            id: attId,
            filename: file.name,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
            r2Key: attKey,
          });
        }
      }

      let threadId = existingThreadId;
      if (threadId) {
        const existingThread = new EmailThreadEntity(c.env, threadId);
        if (await existingThread.exists()) {
          await existingThread.mutate(t => ({
            ...t,
            snippet: body?.slice(0, 100) || t.snippet,
            emailCount: t.emailCount + 1,
            lastEmailAt: now,
            participants: [...new Set([...t.participants, ...toList])],
            labels: [...new Set([...t.labels, 'sent'])],
          }));
        } else {
          threadId = null;
        }
      }

      if (!threadId) {
        threadId = inReplyTo
          ? await generateThreadId(account, subject, undefined, inReplyTo)
          : await generateThreadId(account, subject, undefined, messageId);
        const existingThreadBySubject = new EmailThreadEntity(c.env, threadId);
        if (await existingThreadBySubject.exists()) {
          await existingThreadBySubject.mutate(t => ({
            ...t,
            snippet: body?.slice(0, 100) || t.snippet,
            emailCount: t.emailCount + 1,
            lastEmailAt: now,
            participants: [...new Set([...t.participants, sender.address, ...toList])],
            labels: [...new Set([...t.labels, 'sent'])],
          }));
        } else {
          const newThread: EmailThread = {
            id: threadId,
            account,
            subject,
            participants: [sender.address, ...toList],
            snippet: body?.slice(0, 100) || '',
            emailCount: 1,
            lastEmailAt: now,
            labels: ['sent'],
            read: true,
            starred: false,
          };
          await EmailThreadEntity.create(c.env, newThread);
        }
      }

      const sentEmail: Email = {
        id: emailId,
        account,
        threadId,
        messageId,
        from: sender.address,
        to: toList,
        cc: ccList,
        bcc: bccList,
        subject,
        snippet: body?.slice(0, 100) || '',
        textBody: body,
        htmlBody: htmlBody || undefined,
        rawKey: '',
        attachments,
        labels: ['sent'],
        read: true,
        starred: false,
        createdAt: now,
        inReplyTo: inReplyTo || undefined,
      };
      await EmailEntity.create(c.env, sentEmail);
      return ok(c, { message: 'Email sent successfully', id: sentEmail.id, threadId });
    } catch (error: any) {
      console.error('Send email error:', error);
      return bad(c, 'Failed to send email');
    }
  });

  // Search emails
  app.get('/api/mail/search', async (c) => {
    const raw = c.req.query('q');
    const account = c.req.query('account');
    if (!raw) return ok(c, { items: [] });

    const query = parseSearchQuery(raw);
    const allEmails = await getAllEmails(c.env);
    const matchedThreadIds = new Set<string>();
    for (const e of allEmails) {
      if (matchesSearch(e, query)) matchedThreadIds.add(e.threadId);
    }

    let threads = (await listAll(cursor => EmailThreadEntity.list(c.env, cursor)))
      .filter(t => matchedThreadIds.has(t.id));
    if (account) threads = threads.filter(t => t.account === account);
    threads.sort((a, b) => b.lastEmailAt - a.lastEmailAt);
    return ok(c, { items: threads.slice(0, 50) });
  });

  // ============ DRAFTS API ============

  // List drafts
  app.get('/api/mail/drafts', async (c) => {
    const account = c.req.query('account');
    const page = await EmailDraftEntity.list(c.env);
    let drafts = page.items;
    if (account) {
      drafts = drafts.filter(d => d.account === account);
    }
    drafts.sort((a, b) => b.updatedAt - a.updatedAt);
    return ok(c, { items: drafts });
  });

  // Get single draft
  app.get('/api/mail/drafts/:id', async (c) => {
    const id = c.req.param('id');
    const draft = new EmailDraftEntity(c.env, id);
    if (!await draft.exists()) return notFound(c, 'Draft not found');
    return ok(c, await draft.getState());
  });

  // Create/Update draft
  app.post('/api/mail/drafts', async (c) => {
    const body = await c.req.json() as Partial<EmailDraft> & { id?: string };
    const now = Date.now();

    let account = 'me';
    if (body.from) {
      const sender = await getActiveFromAddress(c.env, body.from);
      if (!sender) return bad(c, 'Invalid sender address');
      account = sender.id;
    }

    const id = body.id || crypto.randomUUID();

    const draft: EmailDraft = {
      id,
      account,
      from: body.from || '',
      to: body.to || '',
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject || '',
      body: body.body || '',
      attachments: body.attachments || [],
      inReplyTo: body.inReplyTo,
      threadId: body.threadId,
      createdAt: body.createdAt || now,
      updatedAt: now,
    };

    const existingDraft = new EmailDraftEntity(c.env, id);
    if (await existingDraft.exists()) {
      const updated = await existingDraft.mutate(() => draft);
      return ok(c, updated);
    } else {
      await EmailDraftEntity.create(c.env, draft);
      return ok(c, draft);
    }
  });

  // Update draft
  app.put('/api/mail/drafts/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json() as Partial<EmailDraft>;
    const draft = new EmailDraftEntity(c.env, id);
    if (!await draft.exists()) return notFound(c, 'Draft not found');

    if (body.from && !(await getActiveFromAddress(c.env, body.from))) {
      return bad(c, 'Invalid sender address');
    }

    const updated = await draft.mutate(d => ({
      ...d,
      from: body.from ?? d.from,
      to: body.to ?? d.to,
      cc: body.cc ?? d.cc,
      bcc: body.bcc ?? d.bcc,
      subject: body.subject ?? d.subject,
      body: body.body ?? d.body,
      attachments: body.attachments ?? d.attachments,
      inReplyTo: body.inReplyTo ?? d.inReplyTo,
      threadId: body.threadId ?? d.threadId,
      updatedAt: Date.now(),
    }));
    return ok(c, updated);
  });

  // Delete draft
  app.delete('/api/mail/drafts/:id', async (c) => {
    const env = c.env as ExtendedEnv;
    const id = c.req.param('id');
    const draft = new EmailDraftEntity(c.env, id);
    if (!await draft.exists()) return notFound(c, 'Draft not found');

    const state = await draft.getState();
    if (env.EMAIL_BUCKET && state.attachments.length > 0) {
      for (const att of state.attachments) {
        try {
          await env.EMAIL_BUCKET.delete(att.r2Key);
        } catch (e) {
          console.error('Failed to delete attachment:', e);
        }
      }
    }

    const deleted = await EmailDraftEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });

  // Upload draft attachment
  app.post('/api/mail/drafts/:id/attachments', async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.EMAIL_BUCKET) return bad(c, 'Storage not configured');

    const draftId = c.req.param('id');
    const draft = new EmailDraftEntity(c.env, draftId);
    if (!await draft.exists()) return notFound(c, 'Draft not found');

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    if (!file) return bad(c, 'No file provided');

    if (file.size > 25 * 1024 * 1024) {
      return bad(c, 'File size must be less than 25MB');
    }

    const state = await draft.getState();
    const attId = crypto.randomUUID();
    const attKey = `drafts/${state.account}/${draftId}/attachments/${attId}`;

    await env.EMAIL_BUCKET.put(attKey, file.stream(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
    });

    const attachment: EmailAttachment = {
      id: attId,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
      r2Key: attKey,
    };

    await draft.mutate(d => ({
      ...d,
      attachments: [...d.attachments, attachment],
      updatedAt: Date.now(),
    }));

    return ok(c, attachment);
  });

  // Delete draft attachment
  app.delete('/api/mail/drafts/:draftId/attachments/:attId', async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.EMAIL_BUCKET) return bad(c, 'Storage not configured');

    const { draftId, attId } = c.req.param();
    const draft = new EmailDraftEntity(c.env, draftId);
    if (!await draft.exists()) return notFound(c, 'Draft not found');

    const state = await draft.getState();
    const attachment = state.attachments.find(a => a.id === attId);
    if (!attachment) return notFound(c, 'Attachment not found');

    try {
      await env.EMAIL_BUCKET.delete(attachment.r2Key);
    } catch (e) {
      console.error('Failed to delete attachment from R2:', e);
    }

    await draft.mutate(d => ({
      ...d,
      attachments: d.attachments.filter(a => a.id !== attId),
      updatedAt: Date.now(),
    }));

    return ok(c, { deleted: true });
  });

  // ============ FILE MANAGER ROUTES ============

  // List files with prefix/delimiter
  app.get('/api/files', adminAuthMiddleware, async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.FILES_BUCKET) return bad(c, 'Files bucket not configured');

    const prefix = c.req.query('prefix') || '';
    const cursor = c.req.query('cursor');
    const limit = Math.min(parseInt(c.req.query('limit') || '100', 10), 1000);

    const listed = await env.FILES_BUCKET.list({
      prefix,
      delimiter: '/',
      cursor,
      limit,
    });

    const items: R2FileItem[] = [];

    if (listed.delimitedPrefixes) {
      for (const folderPrefix of listed.delimitedPrefixes) {
        const name = folderPrefix.slice(prefix.length).replace(/\/$/, '');
        items.push({
          key: folderPrefix,
          name,
          size: 0,
          lastModified: 0,
          type: 'folder',
        });
      }
    }

    for (const obj of listed.objects) {
      if (obj.key === prefix) continue;
      const name = obj.key.slice(prefix.length);
      if (name.endsWith('/') && obj.size === 0) continue;
      items.push({
        key: obj.key,
        name,
        size: obj.size,
        lastModified: obj.uploaded.getTime(),
        type: 'file',
        contentType: obj.httpMetadata?.contentType,
      });
    }

    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return ok(c, {
      items,
      prefix,
      cursor: listed.truncated ? listed.cursor : undefined,
      truncated: listed.truncated,
    });
  });

  // Simple upload for small files
  app.post('/api/files/upload', adminAuthMiddleware, async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.FILES_BUCKET) return bad(c, 'Files bucket not configured');

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const key = formData.get('key') as string;

    if (!file) return bad(c, 'No file provided');
    if (!key) return bad(c, 'No key provided');

    await env.FILES_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
    });

    return ok(c, {
      key,
      size: file.size,
      contentType: file.type || 'application/octet-stream',
    });
  });

  // Initiate multipart upload
  app.post('/api/files/upload/initiate', adminAuthMiddleware, async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.FILES_BUCKET) return bad(c, 'Files bucket not configured');

    const { key, contentType } = await c.req.json();
    if (!key) return bad(c, 'No key provided');

    const multipart = await env.FILES_BUCKET.createMultipartUpload(key, {
      httpMetadata: { contentType: contentType || 'application/octet-stream' },
    });

    return ok(c, {
      uploadId: multipart.uploadId,
      key: multipart.key,
    });
  });

  // Upload part
  app.put('/api/files/upload/part', adminAuthMiddleware, async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.FILES_BUCKET) return bad(c, 'Files bucket not configured');

    const key = c.req.query('key');
    const uploadId = c.req.query('uploadId');
    const partNumber = parseInt(c.req.query('partNumber') || '0', 10);

    if (!key || !uploadId || !partNumber) {
      return bad(c, 'key, uploadId, and partNumber are required');
    }

    const multipart = env.FILES_BUCKET.resumeMultipartUpload(key, uploadId);
    const body = await c.req.arrayBuffer();
    const part = await multipart.uploadPart(partNumber, body);

    return ok(c, {
      partNumber: part.partNumber,
      etag: part.etag,
    });
  });

  // Complete multipart upload
  app.post('/api/files/upload/complete', adminAuthMiddleware, async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.FILES_BUCKET) return bad(c, 'Files bucket not configured');

    const { key, uploadId, parts } = await c.req.json() as {
      key: string;
      uploadId: string;
      parts: MultipartUploadPart[];
    };

    if (!key || !uploadId || !parts?.length) {
      return bad(c, 'key, uploadId, and parts are required');
    }

    const multipart = env.FILES_BUCKET.resumeMultipartUpload(key, uploadId);
    const uploadedParts = parts.map(p => ({
      partNumber: p.partNumber,
      etag: p.etag,
    }));

    await multipart.complete(uploadedParts);

    return ok(c, { key, completed: true });
  });

  // Abort multipart upload
  app.post('/api/files/upload/abort', adminAuthMiddleware, async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.FILES_BUCKET) return bad(c, 'Files bucket not configured');

    const { key, uploadId } = await c.req.json();
    if (!key || !uploadId) return bad(c, 'key and uploadId are required');

    const multipart = env.FILES_BUCKET.resumeMultipartUpload(key, uploadId);
    await multipart.abort();

    return ok(c, { key, aborted: true });
  });

  // Delete file
  app.delete('/api/files/*', adminAuthMiddleware, async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.FILES_BUCKET) return bad(c, 'Files bucket not configured');

    const key = c.req.path.replace('/api/files/', '');
    if (!key) return bad(c, 'No key provided');

    await env.FILES_BUCKET.delete(key);

    return ok(c, { key, deleted: true });
  });

  // Create folder (PUT empty object with trailing /)
  app.post('/api/files/folder', adminAuthMiddleware, async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.FILES_BUCKET) return bad(c, 'Files bucket not configured');

    const { path } = await c.req.json();
    if (!path) return bad(c, 'No path provided');

    const folderKey = path.endsWith('/') ? path : `${path}/`;
    await env.FILES_BUCKET.put(folderKey, new Uint8Array(0));

    return ok(c, { key: folderKey, created: true });
  });

  // Delete folder recursively
  app.delete('/api/files/folder/*', adminAuthMiddleware, async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.FILES_BUCKET) return bad(c, 'Files bucket not configured');

    const prefix = c.req.path.replace('/api/files/folder/', '');
    if (!prefix) return bad(c, 'No prefix provided');

    const folderPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
    let cursor: string | undefined;
    let deletedCount = 0;

    do {
      const listed = await env.FILES_BUCKET.list({ prefix: folderPrefix, cursor });
      if (listed.objects.length > 0) {
        await Promise.all(listed.objects.map(obj => env.FILES_BUCKET!.delete(obj.key)));
        deletedCount += listed.objects.length;
      }
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    await env.FILES_BUCKET.delete(folderPrefix);

    return ok(c, { prefix: folderPrefix, deletedCount, deleted: true });
  });
}