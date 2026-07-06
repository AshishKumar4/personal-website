import type { Email, EmailAddress, EmailDraft } from '@shared/types';
import {
  resolveFromAddress,
  getLocalPart,
  createReplySubject,
  createForwardSubject,
} from './email-utils';
import { escapeHtml, textToHtml } from './email-render';

function quotedBodyHtml(email: Email): string {
  if (email.textBody) return textToHtml(email.textBody);
  if (email.htmlBody) return email.htmlBody;
  return '';
}

export interface ComposeInitialValues {
  fromAccount: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  showCc: boolean;
  showBcc: boolean;
}

export function getDraftInitialValues(
  draft: EmailDraft,
  addresses: EmailAddress[]
): ComposeInitialValues {
  return {
    fromAccount: resolveFromAddress(addresses, draft.from ? getLocalPart(draft.from) : undefined),
    to: draft.to,
    cc: draft.cc ?? '',
    bcc: draft.bcc ?? '',
    subject: draft.subject,
    body: draft.body,
    showCc: Boolean(draft.cc),
    showBcc: Boolean(draft.bcc),
  };
}

export function getNewEmailInitialValues(
  addresses: EmailAddress[],
  defaultFrom?: string
): ComposeInitialValues {
  return {
    fromAccount: resolveFromAddress(addresses, defaultFrom),
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    showCc: false,
    showBcc: false,
  };
}

export function getReplyInitialValues(
  email: Email,
  addresses: EmailAddress[],
  mode: 'reply' | 'replyAll',
  defaultFrom?: string
): ComposeInitialValues {
  const fromAccount = resolveFromAddress(addresses, defaultFrom);

  const isOwnEmail = addresses.some((a) => a.address === email.from);
  const to = isOwnEmail ? email.to[0] || '' : email.from;

  let cc = '';
  if (mode === 'replyAll') {
    const allRecipients = [...email.to, ...(email.cc || [])];
    cc = allRecipients
      .filter((addr) => !addresses.some((a) => a.address === addr) && addr !== email.from)
      .join(', ');
  }

  const senderDisplay = escapeHtml(email.fromName || getLocalPart(email.from));
  const attribution = `On ${new Date(email.createdAt).toLocaleString()}, ${senderDisplay} &lt;${escapeHtml(email.from)}&gt; wrote:`;
  const body = `<p></p><p>${attribution}</p><blockquote>${quotedBodyHtml(email)}</blockquote>`;

  return {
    fromAccount,
    to,
    cc,
    bcc: '',
    subject: createReplySubject(email.subject),
    body,
    showCc: mode === 'replyAll',
    showBcc: false,
  };
}

export function getForwardInitialValues(
  email: Email,
  addresses: EmailAddress[],
  defaultFrom?: string
): ComposeInitialValues {
  const fromAccount = resolveFromAddress(addresses, defaultFrom);

  const fromDisplay = email.fromName
    ? `${escapeHtml(email.fromName)} &lt;${escapeHtml(email.from)}&gt;`
    : escapeHtml(email.from);
  const header = [
    '---------- Forwarded message ----------',
    `From: ${fromDisplay}`,
    `Date: ${escapeHtml(new Date(email.createdAt).toLocaleString())}`,
    `Subject: ${escapeHtml(email.subject)}`,
    `To: ${escapeHtml(email.to.join(', '))}`,
  ].join('<br>');
  const body = `<p></p><p>${header}</p><blockquote>${quotedBodyHtml(email)}</blockquote>`;

  return {
    fromAccount,
    to: '',
    cc: '',
    bcc: '',
    subject: createForwardSubject(email.subject),
    body,
    showCc: false,
    showBcc: false,
  };
}
