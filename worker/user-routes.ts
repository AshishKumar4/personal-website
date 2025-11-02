import { Hono } from "hono";
import type { Env } from './core-utils';
import { UserEntity, ChatBoardEntity, BlogEntity, AuthEntity, SiteConfigEntity, ExperienceEntity, ProjectEntity } from "./entities";
import { ok, bad, notFound, isStr } from './core-utils';
import type { BlogPost, SiteConfig, ChangePasswordPayload, Experience, Project } from "@shared/types";
// Simple token validation middleware (for demo purposes)
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader !== `Bearer supersecrettoken`) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
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
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    if (hashedPassword === storedUser.hashedPassword) {
      // In a real app, generate a proper JWT. For this demo, a static token is used.
      return ok(c, { token: 'supersecrettoken', user: { username: storedUser.username } });
    } else {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }
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
    // Verify current password
    const encoder = new TextEncoder();
    const currentPasswordData = encoder.encode(currentPassword);
    const currentPasswordHashBuffer = await crypto.subtle.digest('SHA-256', currentPasswordData);
    const currentPasswordHashArray = Array.from(new Uint8Array(currentPasswordHashBuffer));
    const currentPasswordHashed = currentPasswordHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    if (currentPasswordHashed !== storedUser.hashedPassword) {
      return c.json({ success: false, error: 'Invalid current password' }, 401);
    }
    // Hash and save new password
    const newPasswordData = encoder.encode(newPassword);
    const newPasswordHashBuffer = await crypto.subtle.digest('SHA-256', newPasswordData);
    const newPasswordHashArray = Array.from(new Uint8Array(newPasswordHashBuffer));
    const newPasswordHashed = newPasswordHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    await adminUser.save({ username: "admin", hashedPassword: newPasswordHashed });
    return ok(c, { message: 'Password updated successfully' });
  });
  // SITE CONFIG
  app.get('/api/config', async (c) => {
    await SiteConfigEntity.seedData(c.env);
    const config = new SiteConfigEntity(c.env, "main");
    return ok(c, await config.getState());
  });
  app.put('/api/config', authMiddleware, async (c) => {
    const { subtitle, bio, about } = await c.req.json() as Partial<SiteConfig>;
    if (!isStr(subtitle) || !isStr(bio) || !isStr(about)) return bad(c, 'subtitle, bio, and about are required');
    const config = new SiteConfigEntity(c.env, "main");
    await config.save({ subtitle, bio, about });
    return ok(c, await config.getState());
  });
  // USERS
  app.get('/api/users', async (c) => {
    await UserEntity.ensureSeed(c.env);
    const cq = c.req.query('cursor');
    const lq = c.req.query('limit');
    const page = await UserEntity.list(c.env, cq ?? null, lq ? Math.max(1, (Number(lq) | 0)) : undefined);
    return ok(c, page);
  });
  app.post('/api/users', async (c) => {
    const { name } = (await c.req.json()) as { name?: string };
    if (!name?.trim()) return bad(c, 'name required');
    return ok(c, await UserEntity.create(c.env, { id: crypto.randomUUID(), name: name.trim() }));
  });
  // CHATS
  app.get('/api/chats', async (c) => {
    await ChatBoardEntity.ensureSeed(c.env);
    const cq = c.req.query('cursor');
    const lq = c.req.query('limit');
    const page = await ChatBoardEntity.list(c.env, cq ?? null, lq ? Math.max(1, (Number(lq) | 0)) : undefined);
    return ok(c, page);
  });
  app.post('/api/chats', async (c) => {
    const { title } = (await c.req.json()) as { title?: string };
    if (!title?.trim()) return bad(c, 'title required');
    const created = await ChatBoardEntity.create(c.env, { id: crypto.randomUUID(), title: title.trim(), messages: [] });
    return ok(c, { id: created.id, title: created.title });
  });
  // MESSAGES
  app.get('/api/chats/:chatId/messages', async (c) => {
    const chat = new ChatBoardEntity(c.env, c.req.param('chatId'));
    if (!await chat.exists()) return notFound(c, 'chat not found');
    return ok(c, await chat.listMessages());
  });
  app.post('/api/chats/:chatId/messages', async (c) => {
    const chatId = c.req.param('chatId');
    const { userId, text } = (await c.req.json()) as { userId?: string; text?: string };
    if (!isStr(userId) || !text?.trim()) return bad(c, 'userId and text required');
    const chat = new ChatBoardEntity(c.env, chatId);
    if (!await chat.exists()) return notFound(c, 'chat not found');
    return ok(c, await chat.sendMessage(userId, text.trim()));
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
  // DELETE: Users
  app.delete('/api/users/:id', async (c) => ok(c, { id: c.req.param('id'), deleted: await UserEntity.delete(c.env, c.req.param('id')) }));
  app.post('/api/users/deleteMany', async (c) => {
    const { ids } = (await c.req.json()) as { ids?: string[] };
    const list = ids?.filter(isStr) ?? [];
    if (list.length === 0) return bad(c, 'ids required');
    return ok(c, { deletedCount: await UserEntity.deleteMany(c.env, list), ids: list });
  });
  // DELETE: Chats
  app.delete('/api/chats/:id', async (c) => ok(c, { id: c.req.param('id'), deleted: await ChatBoardEntity.delete(c.env, c.req.param('id')) }));
  app.post('/api/chats/deleteMany', async (c) => {
    const { ids } = (await c.req.json()) as { ids?: string[] };
    const list = ids?.filter(isStr) ?? [];
    if (list.length === 0) return bad(c, 'ids required');
    return ok(c, { deletedCount: await ChatBoardEntity.deleteMany(c.env, list), ids: list });
  });
}