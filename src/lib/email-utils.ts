import type { Email, EmailAddress } from '@shared/types';

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

export function findAddressByLocalPart(
  addresses: EmailAddress[],
  localPart: string | undefined
): EmailAddress | undefined {
  if (!localPart) return undefined;
  const normalized = localPart.toLowerCase();
  return addresses.find(
    (a) => getLocalPart(a.address) === normalized || a.address.toLowerCase() === normalized
  );
}

export function resolveFromAddress(
  addresses: EmailAddress[],
  preferred: string | undefined
): string {
  const active = addresses.filter((a) => a.status === 'active');
  const matched = findAddressByLocalPart(active, preferred);
  return (matched ?? active[0])?.address || '';
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
