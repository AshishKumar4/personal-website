export const LOCAL_PART_REGEX = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

export const RESERVED_LOCAL_PARTS = new Set([
  'postmaster', 'abuse', 'admin', 'administrator', 'hostmaster',
  'webmaster', 'root', 'noreply', 'no-reply', 'mailer-daemon', 'mail',
]);

export function normalizeLocalPart(input: string): string {
  return input.trim().toLowerCase();
}

export function validateLocalPart(localPart: string): string | null {
  if (localPart.length === 0) return 'Address is required';
  if (localPart.length > 64) return 'Address must be at most 64 characters';
  if (!LOCAL_PART_REGEX.test(localPart)) {
    return 'Use lowercase letters, digits, dots, hyphens, or underscores; must start and end with a letter or digit';
  }
  if (localPart.includes('..')) return 'Address cannot contain consecutive dots';
  if (RESERVED_LOCAL_PARTS.has(localPart)) return 'This address is reserved';
  return null;
}
