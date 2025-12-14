import type { Email, EmailAccount } from '@shared/types';
import {
  findAccountByLocalPart,
  getLocalPart,
  createReplySubject,
  createForwardSubject,
} from './email-utils';

export interface ComposeInitialValues {
  fromAccount: string;
  to: string;
  cc: string;
  subject: string;
  body: string;
  showCc: boolean;
}

export function getNewEmailInitialValues(
  accounts: EmailAccount[],
  defaultFrom?: string
): ComposeInitialValues {
  const matchedAccount = findAccountByLocalPart(accounts, defaultFrom);
  return {
    fromAccount: matchedAccount?.address || accounts[0]?.address || '',
    to: '',
    cc: '',
    subject: '',
    body: '',
    showCc: false,
  };
}

export function getReplyInitialValues(
  email: Email,
  accounts: EmailAccount[],
  mode: 'reply' | 'replyAll',
  defaultFrom?: string
): ComposeInitialValues {
  const matchedAccount = findAccountByLocalPart(accounts, defaultFrom);
  const fromAccount = matchedAccount?.address || accounts[0]?.address || '';

  const isOwnEmail = accounts.some((a) => a.address === email.from);
  const to = isOwnEmail ? email.to[0] || '' : email.from;

  let cc = '';
  if (mode === 'replyAll') {
    const allRecipients = [...email.to, ...(email.cc || [])];
    cc = allRecipients
      .filter((addr) => !accounts.some((a) => a.address === addr) && addr !== email.from)
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
    subject: createReplySubject(email.subject),
    body,
    showCc: mode === 'replyAll',
  };
}

export function getForwardInitialValues(
  email: Email,
  accounts: EmailAccount[],
  defaultFrom?: string
): ComposeInitialValues {
  const matchedAccount = findAccountByLocalPart(accounts, defaultFrom);
  const fromAccount = matchedAccount?.address || accounts[0]?.address || '';

  const fromDisplay = email.fromName
    ? `${email.fromName} <${email.from}>`
    : email.from;

  const body = `\n\n---------- Forwarded message ----------\nFrom: ${fromDisplay}\nDate: ${new Date(email.createdAt).toLocaleString()}\nSubject: ${email.subject}\nTo: ${email.to.join(', ')}\n\n${email.textBody || ''}`;

  return {
    fromAccount,
    to: '',
    cc: '',
    subject: createForwardSubject(email.subject),
    body,
    showCc: false,
  };
}
