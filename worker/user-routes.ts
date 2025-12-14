import { Hono } from "hono";
import type { Env } from './core-utils';
import { BlogEntity, AuthEntity, SiteConfigEntity, ExperienceEntity, ProjectEntity, ContactEntity, EmailEntity, EmailThreadEntity, EmailLabelEntity, EmailDraftEntity, hashPasswordPBKDF2, hashPasswordLegacySHA256, generateSalt, generateSessionToken } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { BlogPost, SiteConfig, ChangePasswordPayload, Experience, Project, ContactMessage, Email, EmailThread, EmailLabel, EmailDraft, EmailAttachment, R2FileItem, MultipartUploadPart } from "@shared/types";
import { EMAIL_ACCOUNTS_CONFIG, EMAIL_ACCOUNT_IDS } from "@shared/types";
import { getEmailRaw, getAttachment, generateThreadId } from './email-utils';
import { createMimeMessage } from 'mimetext';
import { accessMiddleware } from './access-middleware';

interface ExtendedEnv extends Env {
  IMAGES_BUCKET?: R2Bucket;
  EMAIL_BUCKET?: R2Bucket;
  FILES_BUCKET?: R2Bucket;
  EMAIL_SENDER?: any;
}

const EMAIL_ACCOUNTS = EMAIL_ACCOUNTS_CONFIG;

function generateMessageId(domain: string = 'ashishkumarsingh.com'): string {
  return `<${crypto.randomUUID()}@${domain}>`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isAllowedFromAddress(from: string): boolean {
  return EMAIL_ACCOUNTS.some(a => a.address === from);
}

async function getAllEmails(env: ExtendedEnv): Promise<Email[]> {
  const allEmails: Email[] = [];
  let cursor: string | undefined;
  do {
    const page = await EmailEntity.list(env, cursor);
    allEmails.push(...page.items);
    cursor = page.next;
  } while (cursor);
  return allEmails;
}

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }
  const token = authHeader.substring(7);
  const adminUser = new AuthEntity(c.env, "admin");
  if (!(await adminUser.exists())) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }
  const storedUser = await adminUser.getState();
  if (!storedUser.sessionToken || storedUser.sessionToken !== token) {
    return c.json({ success: false, error: 'Invalid or expired token' }, 401);
  }
  if (!storedUser.tokenExpiry || Date.now() > storedUser.tokenExpiry) {
    return c.json({ success: false, error: 'Token expired' }, 401);
  }
  await next();
};
export function userRoutes(app: Hono<{ Bindings: Env }>) {
  app.get('/api/test', (c) => c.json({ success: true, data: { name: 'CF Workers Demo' }}));
  // AUTH
  app.post('/api/login', async (c) => {
    await AuthEntity.seedData(c.env);
    const { username, password } = await c.req.json();
    if (!isStr(username) || !isStr(password)) return bad(c, 'username and password required');
    const user = new AuthEntity(c.env, username);
    if (!await user.exists()) return notFound(c, 'user not found');
    const storedUser = await user.getState();

    let passwordValid = false;

    if (storedUser.salt) {
      const hashedPassword = await hashPasswordPBKDF2(password, storedUser.salt);
      passwordValid = hashedPassword === storedUser.hashedPassword;
    } else {
      const legacyHash = await hashPasswordLegacySHA256(password);
      if (legacyHash === storedUser.hashedPassword) {
        passwordValid = true;
        const newSalt = generateSalt();
        const newHashedPassword = await hashPasswordPBKDF2(password, newSalt);
        await user.mutate(s => ({ ...s, salt: newSalt, hashedPassword: newHashedPassword }));
        console.log(`Migrated user ${username} to PBKDF2 hashing`);
      }
    }

    if (passwordValid) {
      const sessionToken = generateSessionToken();
      const tokenExpiry = Date.now() + SESSION_DURATION;
      await user.mutate(s => ({ ...s, sessionToken, tokenExpiry }));
      return ok(c, { token: sessionToken, user: { username: storedUser.username } });
    } else {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }
  });

  app.post('/api/logout', authMiddleware, async (c) => {
    const adminUser = new AuthEntity(c.env, "admin");
    await adminUser.mutate(s => ({ ...s, sessionToken: "", tokenExpiry: 0 }));
    return ok(c, { message: 'Logged out successfully' });
  });
  app.post('/api/admin/change-password', authMiddleware, async (c) => {
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
    const storedUser = await adminUser.getState();

    let currentPasswordValid = false;
    if (storedUser.salt) {
      const currentPasswordHashed = await hashPasswordPBKDF2(currentPassword, storedUser.salt);
      currentPasswordValid = currentPasswordHashed === storedUser.hashedPassword;
    } else {
      const legacyHash = await hashPasswordLegacySHA256(currentPassword);
      currentPasswordValid = legacyHash === storedUser.hashedPassword;
    }

    if (!currentPasswordValid) {
      return c.json({ success: false, error: 'Invalid current password' }, 401);
    }

    const newSalt = generateSalt();
    const newPasswordHashed = await hashPasswordPBKDF2(newPassword, newSalt);
    const newSessionToken = generateSessionToken();
    const newTokenExpiry = Date.now() + SESSION_DURATION;

    await adminUser.save({
      username: "admin",
      hashedPassword: newPasswordHashed,
      salt: newSalt,
      sessionToken: newSessionToken,
      tokenExpiry: newTokenExpiry
    });

    return ok(c, { message: 'Password updated successfully', token: newSessionToken });
  });
  // SITE CONFIG
  app.get('/api/config', async (c) => {
    await SiteConfigEntity.seedData(c.env);
    const config = new SiteConfigEntity(c.env, "main");
    return ok(c, await config.getState());
  });
  app.put('/api/config', authMiddleware, async (c) => {
    const { subtitle, bio, about, backgroundEffect } = await c.req.json() as Partial<SiteConfig>;
    if (!isStr(subtitle) || !isStr(bio) || !isStr(about)) return bad(c, 'subtitle, bio, and about are required');
    if (!isStr(backgroundEffect) || !['grid', 'particles', 'aurora', 'vortex', 'matrix', 'neural'].includes(backgroundEffect)) {
      return bad(c, 'A valid background effect is required.');
    }
    const config = new SiteConfigEntity(c.env, "main");
    await config.save({ subtitle, bio, about, backgroundEffect });
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
  app.post('/api/posts', authMiddleware, async (c) => {
    const { title, content, author } = await c.req.json() as Partial<BlogPost>;
    if (!isStr(title) || !isStr(content) || !isStr(author)) return bad(c, 'title, content, and author required');
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    const newPost: BlogPost = { id: slug, slug, title, content, author, createdAt: Date.now() };
    const postEntity = new BlogEntity(c.env, slug);
    if (await postEntity.exists()) return bad(c, 'a post with this slug already exists');
    const created = await BlogEntity.create(c.env, newPost);
    return ok(c, created);
  });
  app.put('/api/posts/:slug', authMiddleware, async (c) => {
    const slug = c.req.param('slug');
    const { title, content } = await c.req.json() as Partial<BlogPost>;
    if (!isStr(title) || !isStr(content)) return bad(c, 'title and content required');
    const post = new BlogEntity(c.env, slug);
    if (!await post.exists()) return notFound(c, 'post not found');
    const updated = await post.mutate(s => ({ ...s, title, content }));
    return ok(c, updated);
  });
  app.delete('/api/posts/:slug', authMiddleware, async (c) => {
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
  app.post('/api/experiences', authMiddleware, async (c) => {
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
    };
    const created = await ExperienceEntity.create(c.env, newExperience);
    return ok(c, created);
  });
  app.put('/api/experiences/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json() as Partial<Experience>;
    const exp = new ExperienceEntity(c.env, id);
    if (!await exp.exists()) return notFound(c, 'experience not found');
    const updated = await exp.mutate(s => ({ ...s, ...body, id: s.id }));
    return ok(c, updated);
  });
  app.delete('/api/experiences/:id', authMiddleware, async (c) => {
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
  app.post('/api/projects', authMiddleware, async (c) => {
    const body = await c.req.json() as Partial<Project>;
    const newProject: Project = {
      id: body.name?.toLowerCase().replace(/\s+/g, '-') || crypto.randomUUID(),
      name: body.name || '',
      description: body.description || '',
      repo: body.repo || '',
      url: body.url || '',
    };
    const created = await ProjectEntity.create(c.env, newProject);
    return ok(c, created);
  });
  app.put('/api/projects/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json() as Partial<Project>;
    const proj = new ProjectEntity(c.env, id);
    if (!await proj.exists()) return notFound(c, 'project not found');
    const updated = await proj.mutate(s => ({ ...s, ...body, id: s.id }));
    return ok(c, updated);
  });
  app.delete('/api/projects/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const deleted = await ProjectEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });

  // IMAGE UPLOAD
  app.post('/api/upload', authMiddleware, async (c) => {
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
  app.get('/api/contacts', authMiddleware, async (c) => {
    const page = await ContactEntity.list(c.env);
    page.items.sort((a, b) => b.createdAt - a.createdAt);
    return ok(c, page);
  });

  app.delete('/api/contacts/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const deleted = await ContactEntity.delete(c.env, id);
    return ok(c, { id, deleted });
  });

  // ============ EMAIL SYSTEM ROUTES ============
  // Protected by Cloudflare Zero Trust Access JWT validation
  app.use('/api/mail/*', accessMiddleware);

  // Get configured email accounts
  app.get('/api/mail/accounts', (c) => {
    return ok(c, { accounts: EMAIL_ACCOUNTS });
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
    const label = c.req.query('label') || 'inbox';
    const cursor = c.req.query('cursor');
    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);

    const page = await EmailThreadEntity.list(c.env, cursor, limit + 50);
    let threads = account
      ? page.items.filter(t => t.account === account)
      : page.items;
    if (label !== 'all') {
      threads = threads.filter(t => t.labels.includes(label));
    }
    threads.sort((a, b) => b.lastEmailAt - a.lastEmailAt);

    const hasMore = threads.length > limit;
    const items = threads.slice(0, limit);
    const nextCursor = hasMore ? page.next : null;

    return ok(c, { items, nextCursor });
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
      headers: { 'Content-Type': 'message/rfc822' },
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
    return new Response(data.data, {
      headers: {
        'Content-Type': data.contentType,
        'Content-Disposition': `attachment; filename="${attachment.filename}"`,
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
    const inReplyTo = formData.get('inReplyTo') as string | null;
    const existingThreadId = formData.get('threadId') as string | null;
    const attachmentFiles = formData.getAll('attachments') as File[];

    if (!from || !to || !subject) {
      return bad(c, 'from, to, and subject are required');
    }

    if (!isAllowedFromAddress(from)) {
      return bad(c, 'Invalid sender address');
    }

    const toList = to.split(',').map(a => a.trim()).filter(Boolean);
    if (toList.some(addr => !isValidEmail(addr))) {
      return bad(c, 'Invalid recipient email address');
    }

    try {
      const messageId = generateMessageId();
      const msg = createMimeMessage();
      msg.setSender({ addr: from });
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
      if (inReplyTo) {
        msg.setHeader('In-Reply-To', inReplyTo);
      }
      if (body) {
        msg.addMessage({ contentType: 'text/plain', data: body });
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
          data: btoa(String.fromCharCode(...new Uint8Array(content))),
        });
      }

      const { EmailMessage } = await import('cloudflare:email');
      const emailMsg = new EmailMessage(from, toList[0], msg.asRaw());
      await env.EMAIL_SENDER.send(emailMsg);

      const account = from.split('@')[0];
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
          ? generateThreadId(subject, undefined, inReplyTo)
          : generateThreadId(subject, undefined, messageId);
        const existingThreadBySubject = new EmailThreadEntity(c.env, threadId);
        if (await existingThreadBySubject.exists()) {
          await existingThreadBySubject.mutate(t => ({
            ...t,
            snippet: body?.slice(0, 100) || t.snippet,
            emailCount: t.emailCount + 1,
            lastEmailAt: now,
            participants: [...new Set([...t.participants, from, ...toList])],
            labels: [...new Set([...t.labels, 'sent'])],
          }));
        } else {
          const newThread: EmailThread = {
            id: threadId,
            account,
            subject,
            participants: [from, ...toList],
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
        from,
        to: toList,
        cc: ccList,
        bcc: bccList,
        subject,
        snippet: body?.slice(0, 100) || '',
        textBody: body,
        htmlBody: undefined,
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
      return bad(c, `Failed to send email: ${error.message}`);
    }
  });

  // Search emails
  app.get('/api/mail/search', async (c) => {
    const q = c.req.query('q')?.toLowerCase();
    const account = c.req.query('account');
    if (!q) return ok(c, { items: [] });
    const allEmails = await getAllEmails(c.env);
    let results = allEmails.filter(e =>
      e.subject.toLowerCase().includes(q) ||
      e.from.toLowerCase().includes(q) ||
      e.snippet.toLowerCase().includes(q) ||
      (e.textBody && e.textBody.toLowerCase().includes(q))
    );
    if (account) {
      results = results.filter(e => e.account === account);
    }
    results.sort((a, b) => b.createdAt - a.createdAt);
    return ok(c, { items: results.slice(0, 50) });
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
    const env = c.env as ExtendedEnv;
    const body = await c.req.json() as Partial<EmailDraft> & { id?: string };
    const now = Date.now();

    if (body.from && !isAllowedFromAddress(body.from)) {
      return bad(c, 'Invalid sender address');
    }

    const id = body.id || crypto.randomUUID();
    const account = body.from?.split('@')[0] || 'me';

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

    if (body.from && !isAllowedFromAddress(body.from)) {
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
  app.get('/api/files', authMiddleware, async (c) => {
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
      cursor: listed.cursor,
      truncated: listed.truncated,
    });
  });

  // Simple upload for small files
  app.post('/api/files/upload', authMiddleware, async (c) => {
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
  app.post('/api/files/upload/initiate', authMiddleware, async (c) => {
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
  app.put('/api/files/upload/part', authMiddleware, async (c) => {
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
  app.post('/api/files/upload/complete', authMiddleware, async (c) => {
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
  app.post('/api/files/upload/abort', authMiddleware, async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.FILES_BUCKET) return bad(c, 'Files bucket not configured');

    const { key, uploadId } = await c.req.json();
    if (!key || !uploadId) return bad(c, 'key and uploadId are required');

    const multipart = env.FILES_BUCKET.resumeMultipartUpload(key, uploadId);
    await multipart.abort();

    return ok(c, { key, aborted: true });
  });

  // Delete file
  app.delete('/api/files/*', authMiddleware, async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.FILES_BUCKET) return bad(c, 'Files bucket not configured');

    const key = c.req.path.replace('/api/files/', '');
    if (!key) return bad(c, 'No key provided');

    await env.FILES_BUCKET.delete(key);

    return ok(c, { key, deleted: true });
  });

  // Create folder (PUT empty object with trailing /)
  app.post('/api/files/folder', authMiddleware, async (c) => {
    const env = c.env as ExtendedEnv;
    if (!env.FILES_BUCKET) return bad(c, 'Files bucket not configured');

    const { path } = await c.req.json();
    if (!path) return bad(c, 'No path provided');

    const folderKey = path.endsWith('/') ? path : `${path}/`;
    await env.FILES_BUCKET.put(folderKey, new Uint8Array(0));

    return ok(c, { key: folderKey, created: true });
  });

  // Delete folder recursively
  app.delete('/api/files/folder/*', authMiddleware, async (c) => {
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