import type { Env } from './core-utils';
import type { EmailAddress } from '@shared/types';
import { normalizeLocalPart } from '@shared/address-validation';
import { EmailAddressEntity } from './entities';

const THROWAWAY_ADJECTIVES = [
  'amber', 'brisk', 'cedar', 'civic', 'coral', 'crisp', 'dusty', 'eager',
  'ember', 'faded', 'fuzzy', 'gilded', 'hazel', 'humble', 'indigo', 'ivory',
  'jade', 'keen', 'lively', 'lucid', 'lunar', 'mellow', 'misty', 'noble',
  'nimble', 'ochre', 'opal', 'pale', 'plush', 'quiet', 'rustic', 'sable',
  'sandy', 'silent', 'sleek', 'solar', 'stony', 'swift', 'tidal', 'topaz',
  'umber', 'vivid', 'wandering', 'warm', 'wild', 'witty', 'woven', 'zesty',
] as const;

const THROWAWAY_NOUNS = [
  'anchor', 'aspen', 'badger', 'beacon', 'birch', 'bloom', 'breeze', 'brook',
  'canyon', 'cliff', 'comet', 'crane', 'dune', 'falcon', 'fern', 'fjord',
  'gale', 'glade', 'grove', 'harbor', 'heron', 'inlet', 'lagoon', 'lantern',
  'larch', 'marsh', 'meadow', 'mesa', 'orbit', 'otter', 'pebble', 'pine',
  'plume', 'quartz', 'raven', 'reef', 'ridge', 'sparrow', 'summit', 'thicket',
  'tundra', 'vale', 'walnut', 'willow', 'wren', 'yarrow', 'zenith', 'zephyr',
] as const;

function randomItem<T>(items: readonly T[]): T {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return items[buf[0] % items.length];
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateThrowawayLocalPart(env: Env): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = `${randomItem(THROWAWAY_ADJECTIVES)}-${randomItem(THROWAWAY_NOUNS)}-${randomHex(2)}`;
    if (!(await new EmailAddressEntity(env, slug).exists())) return slug;
  }
  throw new Error('Failed to generate a unique throwaway address');
}

export async function resolveAddress(env: Env, toAddress: string): Promise<EmailAddress | null> {
  const localPart = normalizeLocalPart(toAddress.split('@')[0] ?? '');
  if (!localPart) return null;
  await EmailAddressEntity.ensureSeed(env);
  const entity = new EmailAddressEntity(env, localPart);
  if (!(await entity.exists())) return null;
  return entity.getState();
}

export async function getActiveFromAddress(env: Env, from: string): Promise<EmailAddress | null> {
  const normalized = from.trim().toLowerCase();
  const addr = await resolveAddress(env, normalized);
  if (!addr || addr.status !== 'active' || addr.address !== normalized) return null;
  return addr;
}
