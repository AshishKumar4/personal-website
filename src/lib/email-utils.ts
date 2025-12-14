import type { Email, EmailAccount } from '@shared/types';

export function getSenderName(email: Email): string {
  return email.fromName || email.from.split('@')[0];
}

export function getLocalPart(email: string): string {
  return email.split('@')[0]?.toLowerCase() || '';
}

export function getEmailDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() || '';
}

export function stripSubjectPrefixes(subject: string): string {
  return subject.replace(/^(re|fwd|fw):\s*/gi, '').trim();
}

export function createReplySubject(subject: string): string {
  return `Re: ${stripSubjectPrefixes(subject)}`;
}

export function createForwardSubject(subject: string): string {
  return `Fwd: ${stripSubjectPrefixes(subject)}`;
}

export function findAccountByLocalPart(
  accounts: EmailAccount[],
  localPart: string | undefined
): EmailAccount | undefined {
  if (!localPart) return undefined;
  const normalized = localPart.toLowerCase();
  return accounts.find(
    (a) => getLocalPart(a.address) === normalized || a.address.toLowerCase() === normalized
  );
}

export function generateAttachmentId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function parseEmailList(input: string): string[] {
  return input
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0);
}

export function validateRecipients(input: string): { valid: boolean; invalidEmails: string[] } {
  const emails = parseEmailList(input);
  const invalidEmails = emails.filter((e) => !isValidEmail(e));
  return {
    valid: invalidEmails.length === 0 && emails.length > 0,
    invalidEmails,
  };
}

export function extractNewContent(text: string | undefined): string {
  if (!text) return '';

  const lines = text.split('\n');
  const newLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (trimmedLine.match(/^On\s+.+\s+wrote:\s*$/i)) {
      break;
    }

    if (trimmedLine.startsWith('>')) {
      break;
    }

    if (trimmedLine.includes('---------- Forwarded message')) {
      break;
    }

    newLines.push(line);
  }

  let result = newLines.join('\n').trim();

  if (!result && text.trim()) {
    const firstLines = text.split('\n').slice(0, 5).join('\n');
    result = firstLines.trim();
  }

  return result;
}

export function extractNewHtmlContent(html: string | undefined): string {
  if (!html) return '';

  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(html, 'text/html');
  } catch {
    return html;
  }

  const blockquotes = doc.querySelectorAll('blockquote');
  blockquotes.forEach(bq => bq.remove());

  const gmailQuotes = doc.querySelectorAll('.gmail_quote, .yahoo_quoted, .OutlookMessageHeader');
  gmailQuotes.forEach(q => q.remove());

  const divs = doc.querySelectorAll('div');
  divs.forEach(div => {
    const text = div.textContent || '';
    if (text.match(/^On\s+.+\s+wrote:\s*$/i)) {
      let sibling = div.nextElementSibling;
      while (sibling) {
        const next = sibling.nextElementSibling;
        sibling.remove();
        sibling = next;
      }
      div.remove();
    }
  });

  return doc.body.innerHTML;
}
