import PostalMime from 'postal-mime';
import type { Email, EmailThread, EmailAttachment } from '@shared/types';
import { EmailEntity, EmailThreadEntity, BlockedSenderEntity } from './entities';
import { resolveAddress } from './address-utils';
import { htmlToSnippet, generateThreadId } from './mail-encoding';
import type { Env } from './core-utils';

export { generateThreadId };

const MAX_INBOUND_BYTES = 25 * 1024 * 1024;
const MAX_INBOUND_ATTACHMENTS = 50;
const MAX_INBOUND_ATTACHMENT_BYTES = 25 * 1024 * 1024;

interface ExtendedEnv extends Env {
  EMAIL_BUCKET?: R2Bucket;
}

interface IncomingEmailMessage {
  from: string;
  to: string;
  headers: Headers;
  raw: ReadableStream<Uint8Array>;
  rawSize: number;
  setReject(reason: string): void;
}

async function isBlockedSender(env: Env, envelopeFrom: string, headerFrom: string): Promise<boolean> {
  if (await new BlockedSenderEntity(env, envelopeFrom).exists()) return true;
  if (headerFrom !== envelopeFrom && await new BlockedSenderEntity(env, headerFrom).exists()) return true;
  return false;
}

export function createSnippet(text: string | undefined, html?: string | undefined, maxLength = 100): string {
  if (text) return text.replace(/\s+/g, ' ').trim().slice(0, maxLength);
  return htmlToSnippet(html, maxLength);
}

export async function handleIncomingEmail(
  message: IncomingEmailMessage,
  env: ExtendedEnv
): Promise<void> {
  const addr = await resolveAddress(env, message.to);
  if (!addr) {
    console.log(`Rejecting email to unknown address: ${message.to}`);
    message.setReject('No such recipient');
    return;
  }
  if (addr.status === 'suppressed') {
    console.log(`Dropping email to suppressed address: ${message.to}`);
    return;
  }
  const account = addr.id;

  if (message.rawSize > MAX_INBOUND_BYTES) {
    console.log(`Rejecting oversize email (${message.rawSize} bytes) to ${message.to}`);
    message.setReject('Message too large');
    return;
  }

  const rawBytes = await streamToArrayBuffer(message.raw);
  const parser = new PostalMime();
  const parsed = await parser.parse(rawBytes);

  const envelopeFrom = message.from.toLowerCase();
  const headerFrom = (parsed.from?.address ?? message.from).toLowerCase();
  const blocked = await isBlockedSender(env, envelopeFrom, headerFrom);

  const messageId = parsed.messageId || crypto.randomUUID();
  const subject = parsed.subject || '(No Subject)';
  const inReplyTo = parsed.inReplyTo;
  const references = parsed.references ? parsed.references.split(/\s+/) : [];
  const threadId = await generateThreadId(account, subject, references, inReplyTo);
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
    for (const att of parsed.attachments.slice(0, MAX_INBOUND_ATTACHMENTS)) {
      const contentSize = att.content
        ? (typeof att.content === 'string' ? att.content.length : (att.content as ArrayBuffer).byteLength)
        : 0;
      if (contentSize > MAX_INBOUND_ATTACHMENT_BYTES) {
        console.log(`Skipping oversize attachment (${contentSize} bytes) on email to ${message.to}`);
        continue;
      }
      const attId = crypto.randomUUID();
      const attKey = `emails/${account}/${emailId}/attachments/${attId}`;
      if (env.EMAIL_BUCKET && att.content) {
        await env.EMAIL_BUCKET.put(attKey, att.content, {
          httpMetadata: { contentType: att.mimeType || 'application/octet-stream' },
        });
      }
      attachments.push({
        id: attId,
        filename: att.filename || 'attachment',
        contentType: att.mimeType || 'application/octet-stream',
        size: contentSize,
        r2Key: attKey,
        contentId: att.contentId || undefined,
        disposition: (att.disposition === 'inline' || att.disposition === 'attachment')
          ? att.disposition
          : undefined,
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

  const parsedDate = (() => {
    if (!parsed.date) return now;
    const ts = new Date(parsed.date).getTime();
    return Number.isNaN(ts) ? now : ts;
  })();

  const email: Email = {
    id: emailId,
    account,
    threadId,
    messageId,
    from: (parsed.from?.address || message.from).toLowerCase(),
    fromName: parsed.from?.name || undefined,
    to: parsed.to?.map(t => (t.address || t.name || '').toLowerCase()).filter(Boolean) || [message.to.toLowerCase()],
    cc: parsed.cc?.map(c => (c.address || c.name || '').toLowerCase()).filter(Boolean),
    replyTo: replyToAddr,
    subject,
    snippet: createSnippet(parsed.text, parsed.html),
    htmlBody: parsed.html,
    textBody: parsed.text,
    rawKey,
    attachments,
    labels: blocked ? ['spam'] : ['inbox'],
    read: false,
    starred: false,
    createdAt: parsedDate,
    inReplyTo,
    references,
  };

  await EmailEntity.create(env, email);

  const threadEntity = new EmailThreadEntity(env, threadId);
  if (await threadEntity.exists()) {
    await threadEntity.mutate(thread => {
      const merged = new Set([...thread.labels, ...email.labels]);
      if (blocked) merged.delete('inbox');
      return {
        ...thread,
        snippet: email.snippet,
        emailCount: thread.emailCount + 1,
        lastEmailAt: email.createdAt,
        participants: [...new Set([...thread.participants, email.from])],
        read: false,
        labels: [...merged],
      };
    });
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
