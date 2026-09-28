import { DEFAULT_ORIGINS } from '@shared/types';

export function originParagraphs(text: string | undefined): string[] {
  const source = text?.trim() ? text : DEFAULT_ORIGINS;
  return source
    .split('\n')
    .filter(line => !/^\s*##\s/.test(line))
    .join('\n')
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}
