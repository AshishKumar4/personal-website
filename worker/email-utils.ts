import PostalMime from 'postal-mime';
import type { Email, EmailThread, EmailAttachment, EmailAccountId } from '@shared/types';
import { EMAIL_ACCOUNT_IDS } from '@shared/types';
import { EmailEntity, EmailThreadEntity } from './entities';
import type { Env } from './core-utils';

interface ExtendedEnv extends Env {
  EMAIL_BUCKET?: R2Bucket;
}

interface IncomingEmailMessage {
  from: string;
  to: string;
  headers: Headers;
  raw: ReadableStream<Uint8Array>;
  rawSize: number;
}

function extractAccount(toAddress: string): EmailAccountId | null {
  const localPart = toAddress.split('@')[0]?.toLowerCase();
  if (EMAIL_ACCOUNT_IDS.includes(localPart as EmailAccountId)) {
    return localPart as EmailAccountId;
  }
  console.warn(`Unknown email account: ${localPart}, rejecting email to: ${toAddress}`);
  return null;
}

export function generateThreadId(subject: string, references?: string[], inReplyTo?: string): string {
  if (inReplyTo) {
    const match = inReplyTo.match(/<([^>]+)>/);
    if (match) {
      return match[1].split('@')[0].replace(/[^a-zA-Z0-9-]/g, '_').slice(0, 64);
    }
  }
  if (references && references.length > 0) {
    const firstRef = references[0];
    const match = firstRef.match(/<([^>]+)>/);
    if (match) {
      return match[1].split('@')[0].replace(/[^a-zA-Z0-9-]/g, '_').slice(0, 64);
    }
  }
  const normalizedSubject = subject
    .replace(/^(re|fwd|fw):\s*/gi, '')
    .toLowerCase()
    .trim();
  return btoa(normalizedSubject).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
}

export function createSnippet(text: string | undefined, maxLength: number = 100): string {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export async function handleIncomingEmail(
  message: IncomingEmailMessage,
  env: ExtendedEnv
): Promise<void> {
  const account = extractAccount(message.to);
  if (!account) {
    console.log(`Unknown account for address: ${message.to}`);
    return;
  }

  const rawBytes = await streamToArrayBuffer(message.raw);
  const parser = new PostalMime();
  const parsed = await parser.parse(rawBytes);

  const messageId = parsed.messageId || crypto.randomUUID();
  const subject = parsed.subject || '(No Subject)';
  const inReplyTo = parsed.inReplyTo;
  const references = parsed.references ? parsed.references.split(/\s+/) : [];
  const threadId = generateThreadId(subject, references, inReplyTo);
  const emailId = crypto.randomUUID();
  const now = Date.now();

  const rawKey = `emails/${account}/${emailId}/raw.eml`;
  if (env.EMAIL_BUCKET) {
    await env.EMAIL_BUCKET.put(rawKey, rawBytes, {
      httpMetadata: { contentType: 'message/rfc822' },
    });
  }

  const attachments: EmailAttachment[] = [];
  if (parsed.attachments && parsed.attachments.length > 0) {
    for (const att of parsed.attachments) {
      const attId = crypto.randomUUID();
      const attKey = `emails/${account}/${emailId}/attachments/${attId}`;
      if (env.EMAIL_BUCKET && att.content) {
        await env.EMAIL_BUCKET.put(attKey, att.content, {
          httpMetadata: { contentType: att.mimeType || 'application/octet-stream' },
        });
      }
      const contentSize = att.content
        ? (typeof att.content === 'string' ? att.content.length : (att.content as ArrayBuffer).byteLength)
        : 0;
      attachments.push({
        id: attId,
        filename: att.filename || 'attachment',
        contentType: att.mimeType || 'application/octet-stream',
        size: contentSize,
        r2Key: attKey,
      });
    }
  }

  const replyToAddr = (() => {
    if (Array.isArray(parsed.replyTo) && parsed.replyTo.length > 0) {
      return parsed.replyTo[0]?.address;
    }
    if (parsed.replyTo && typeof parsed.replyTo === 'object' && 'address' in parsed.replyTo) {
      return (parsed.replyTo as { address?: string }).address;
    }
    return undefined;
  })();

  const email: Email = {
    id: emailId,
    account,
    threadId,
    messageId,
    from: parsed.from?.address || message.from,
    fromName: parsed.from?.name || undefined,
    to: parsed.to?.map(t => t.address || t.name || '') || [message.to],
    cc: parsed.cc?.map(c => c.address || c.name || ''),
    replyTo: replyToAddr,
    subject,
    snippet: createSnippet(parsed.text),
    htmlBody: parsed.html,
    textBody: parsed.text,
    rawKey,
    attachments,
    labels: ['inbox'],
    read: false,
    starred: false,
    createdAt: parsed.date ? new Date(parsed.date).getTime() : now,
    inReplyTo,
    references,
  };

  await EmailEntity.create(env, email);

  const threadEntity = new EmailThreadEntity(env, threadId);
  if (await threadEntity.exists()) {
    await threadEntity.mutate(thread => ({
      ...thread,
      snippet: email.snippet,
      emailCount: thread.emailCount + 1,
      lastEmailAt: email.createdAt,
      participants: [...new Set([...thread.participants, email.from])],
      read: false,
      labels: [...new Set([...thread.labels, ...email.labels])],
    }));
  } else {
    const thread: EmailThread = {
      id: threadId,
      account,
      subject: email.subject.replace(/^(re|fwd|fw):\s*/gi, ''),
      participants: [email.from],
      snippet: email.snippet,
      emailCount: 1,
      lastEmailAt: email.createdAt,
      labels: email.labels,
      read: false,
      starred: false,
    };
    await EmailThreadEntity.create(env, thread);
  }

  console.log(`Email stored: ${emailId} (thread: ${threadId}) for account: ${account}`);
}

async function streamToArrayBuffer(stream: ReadableStream<Uint8Array>): Promise<ArrayBuffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result.buffer;
}

export async function getEmailRaw(env: ExtendedEnv, rawKey: string): Promise<ArrayBuffer | null> {
  if (!env.EMAIL_BUCKET) return null;
  const object = await env.EMAIL_BUCKET.get(rawKey);
  if (!object) return null;
  return object.arrayBuffer();
}

export async function getAttachment(env: ExtendedEnv, r2Key: string): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  if (!env.EMAIL_BUCKET) return null;
  const object = await env.EMAIL_BUCKET.get(r2Key);
  if (!object) return null;
  return {
    data: await object.arrayBuffer(),
    contentType: object.httpMetadata?.contentType || 'application/octet-stream',
  };
}
