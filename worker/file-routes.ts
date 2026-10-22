import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import type { Env } from './core-utils';
import { ok, bad, notFound, isStr } from './core-utils';
import { ShareLinkEntity } from './entities';
import { accessMiddleware } from './access-middleware';
import { sessionAuthMiddleware } from './admin-auth';
import { generateShareToken, isShareToken, isLiveShareLink, sharedFileResponse, SHARE_HEADERS } from './file-shares';
import type { CreateShareLinkPayload, MultipartUploadPart, R2FileItem } from '@shared/types';

interface FilesEnv extends Env {
  FILES_BUCKET?: R2Bucket;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
}

type FilesApp = { Bindings: FilesEnv; Variables: { bucket: R2Bucket } };

const withBucket = createMiddleware<FilesApp>(async (c, next) => {
  if (!c.env.FILES_BUCKET) return bad(c, 'Files bucket not configured');
  c.set('bucket', c.env.FILES_BUCKET);
  await next();
});

async function revokeShareLinks(env: Env, matches: (key: string) => boolean): Promise<void> {
  const { items } = await ShareLinkEntity.list(env);
  await ShareLinkEntity.deleteMany(env, items.filter(link => matches(link.key)).map(link => link.id));
}

export const sharedFileRoutes = new Hono<{ Bindings: FilesEnv }>();

sharedFileRoutes.get('/s/:token', async (c) => {
  const token = c.req.param('token');
  const link = isShareToken(token) ? await new ShareLinkEntity(c.env, token).getState() : null;
  const served = link && c.env.FILES_BUCKET && isLiveShareLink(link, Date.now())
    ? await sharedFileResponse(c.env.FILES_BUCKET, link, c.req.raw)
    : null;
  return served ?? new Response('Not found', { status: 404, headers: SHARE_HEADERS });
});

export const fileAdminRoutes = new Hono<FilesApp>();

fileAdminRoutes.use('/api/files/*', accessMiddleware, sessionAuthMiddleware, withBucket);
fileAdminRoutes.use('/api/shares/*', accessMiddleware, sessionAuthMiddleware, withBucket);

fileAdminRoutes.get('/api/files', async (c) => {
  const prefix = c.req.query('prefix') || '';
  const cursor = c.req.query('cursor');
  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10), 1000);

  const listed = await c.var.bucket.list({ prefix, delimiter: '/', cursor, limit });
  const items: R2FileItem[] = [];

  for (const folderPrefix of listed.delimitedPrefixes) {
    const name = folderPrefix.slice(prefix.length).replace(/\/$/, '');
    items.push({ key: folderPrefix, name, size: 0, lastModified: 0, type: 'folder' });
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

fileAdminRoutes.post('/api/files/upload', async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('file');
  const key = formData.get('key');

  if (!(file instanceof File)) return bad(c, 'No file provided');
  if (!isStr(key)) return bad(c, 'No key provided');

  await revokeShareLinks(c.env, linkKey => linkKey === key);
  await c.var.bucket.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });

  return ok(c, { key, size: file.size, contentType: file.type || 'application/octet-stream' });
});

fileAdminRoutes.post('/api/files/upload/initiate', async (c) => {
  const { key, contentType } = await c.req.json<{ key?: unknown; contentType?: unknown }>();
  if (!isStr(key)) return bad(c, 'No key provided');

  const multipart = await c.var.bucket.createMultipartUpload(key, {
    httpMetadata: { contentType: isStr(contentType) ? contentType : 'application/octet-stream' },
  });

  return ok(c, { uploadId: multipart.uploadId, key: multipart.key });
});

fileAdminRoutes.put('/api/files/upload/part', async (c) => {
  const key = c.req.query('key');
  const uploadId = c.req.query('uploadId');
  const partNumber = parseInt(c.req.query('partNumber') || '0', 10);

  if (!key || !uploadId || !partNumber) {
    return bad(c, 'key, uploadId, and partNumber are required');
  }

  const multipart = c.var.bucket.resumeMultipartUpload(key, uploadId);
  const part = await multipart.uploadPart(partNumber, await c.req.arrayBuffer());

  return ok(c, { partNumber: part.partNumber, etag: part.etag });
});

fileAdminRoutes.post('/api/files/upload/complete', async (c) => {
  const { key, uploadId, parts } = await c.req.json<{ key?: unknown; uploadId?: unknown; parts?: MultipartUploadPart[] }>();
  if (!isStr(key) || !isStr(uploadId) || !parts?.length) {
    return bad(c, 'key, uploadId, and parts are required');
  }

  const multipart = c.var.bucket.resumeMultipartUpload(key, uploadId);
  await revokeShareLinks(c.env, linkKey => linkKey === key);
  await multipart.complete(parts.map(p => ({ partNumber: p.partNumber, etag: p.etag })));

  return ok(c, { key, completed: true });
});

fileAdminRoutes.post('/api/files/upload/abort', async (c) => {
  const { key, uploadId } = await c.req.json<{ key?: unknown; uploadId?: unknown }>();
  if (!isStr(key) || !isStr(uploadId)) return bad(c, 'key and uploadId are required');

  await c.var.bucket.resumeMultipartUpload(key, uploadId).abort();

  return ok(c, { key, aborted: true });
});

fileAdminRoutes.post('/api/files/folder', async (c) => {
  const { path } = await c.req.json<{ path?: unknown }>();
  if (!isStr(path)) return bad(c, 'No path provided');

  const folderKey = path.endsWith('/') ? path : `${path}/`;
  await c.var.bucket.put(folderKey, new Uint8Array(0));

  return ok(c, { key: folderKey, created: true });
});

fileAdminRoutes.delete('/api/files/folder/*', async (c) => {
  const prefix = decodeURIComponent(new URL(c.req.url).pathname.slice('/api/files/folder/'.length));
  if (!prefix) return bad(c, 'No prefix provided');

  const folderPrefix = prefix.endsWith('/') ? prefix : `${prefix}/`;
  await revokeShareLinks(c.env, linkKey => linkKey.startsWith(folderPrefix));
  let cursor: string | undefined;
  let deletedCount = 0;

  do {
    const listed = await c.var.bucket.list({ prefix: folderPrefix, cursor });
    if (listed.objects.length > 0) {
      await c.var.bucket.delete(listed.objects.map(obj => obj.key));
      deletedCount += listed.objects.length;
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  await c.var.bucket.delete(folderPrefix);

  return ok(c, { prefix: folderPrefix, deletedCount, deleted: true });
});

fileAdminRoutes.delete('/api/files/*', async (c) => {
  const key = decodeURIComponent(new URL(c.req.url).pathname.slice('/api/files/'.length));
  if (!key) return bad(c, 'No key provided');

  await revokeShareLinks(c.env, linkKey => linkKey === key);
  await c.var.bucket.delete(key);

  return ok(c, { key, deleted: true });
});

fileAdminRoutes.get('/api/shares', async (c) => {
  const now = Date.now();
  const { items: links } = await ShareLinkEntity.list(c.env);
  const stale = links.filter(link => !isLiveShareLink(link, now));
  if (stale.length > 0) await ShareLinkEntity.deleteMany(c.env, stale.map(link => link.id));
  const items = links.filter(link => isLiveShareLink(link, now)).sort((a, b) => b.createdAt - a.createdAt);
  return ok(c, { items });
});

fileAdminRoutes.post('/api/shares', async (c) => {
  const { key, ttlSeconds } = await c.req.json<Partial<CreateShareLinkPayload>>();
  if (!isStr(key) || key.endsWith('/')) return bad(c, 'A file key is required');
  if (ttlSeconds !== null && !(typeof ttlSeconds === 'number' && Number.isSafeInteger(ttlSeconds) && ttlSeconds > 0)) {
    return bad(c, 'ttlSeconds must be a positive whole number, or null for a link that never expires');
  }
  const head = await c.var.bucket.head(key);
  if (!head) return notFound(c, 'File not found');
  const now = Date.now();
  const link = await ShareLinkEntity.create(c.env, {
    id: generateShareToken(),
    key,
    etag: head.etag,
    createdAt: now,
    expiresAt: ttlSeconds === null ? null : now + ttlSeconds * 1000,
  });
  return ok(c, link);
});

fileAdminRoutes.delete('/api/shares/:token', async (c) => {
  const token = c.req.param('token');
  if (!(await ShareLinkEntity.delete(c.env, token))) return notFound(c, 'Link not found');
  return ok(c, { id: token, deleted: true });
});
