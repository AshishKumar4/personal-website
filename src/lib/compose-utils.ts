import type { Email, EmailAddress, EmailDraft } from '@shared/types';
import {
  resolveFromAddress,
  getLocalPart,
  createReplySubject,
  createForwardSubject,
} from './email-utils';

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

  const senderDisplay = email.fromName || getLocalPart(email.from);
  const quotedBody = email.textBody
    ? email.textBody.split('\n').map((line) => `> ${line}`).join('\n')
    : '';
  const body = `\n\nOn ${new Date(email.createdAt).toLocaleString()}, ${senderDisplay} wrote:\n${quotedBody}`;

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
    ? `${email.fromName} <${email.from}>`
    : email.from;

  const body = `\n\n---------- Forwarded message ----------\nFrom: ${fromDisplay}\nDate: ${new Date(email.createdAt).toLocaleString()}\nSubject: ${email.subject}\nTo: ${email.to.join(', ')}\n\n${email.textBody || ''}`;

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
