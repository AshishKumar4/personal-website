import { Hono } from "hono";
import type { Env } from './core-utils';
import { BlogEntity, AuthEntity, SiteConfigEntity, ExperienceEntity, ProjectEntity, hashPasswordPBKDF2, hashPasswordLegacySHA256, generateSalt, generateSessionToken } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { BlogPost, SiteConfig, ChangePasswordPayload, Experience, Project } from "@shared/types";

interface ExtendedEnv extends Env {
  IMAGES_BUCKET?: R2Bucket;
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
}