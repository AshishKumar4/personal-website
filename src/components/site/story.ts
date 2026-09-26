import { DEFAULT_STORY, type SceneId, type SiteConfig, type StoryChapter } from '@shared/types';

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export const SCENE_TONE: Record<SceneId, string> = {
  night: '218 40% 84%',
  kernel: '38 92% 64%',
  breach: '356 84% 64%',
  signal: '188 86% 68%',
  noise: '258 90% 78%',
  swarm: '152 70% 62%',
  dawn: '26 96% 68%',
};

export type ChapterLayout = 'left' | 'right' | 'split' | 'center' | 'low';

const LAYOUTS: ChapterLayout[] = ['left', 'right', 'split', 'center', 'low'];

export function layoutFor(index: number): ChapterLayout {
  return LAYOUTS[index % LAYOUTS.length];
}

export function resolveStory(config: SiteConfig | null): StoryChapter[] {
  const story = config?.story;
  return story && story.length > 0 ? story : DEFAULT_STORY;
}

export function roman(index: number): string {
  return ROMAN[index] ?? String(index + 1);
}

export function projectHue(index: number): number {
  return (0.07 + index * 0.618034) % 1;
}

export function splitCount(value: string): { before: string; n: number; decimals: number; after: string } | null {
  for (const m of value.matchAll(/\d+(?:\.\d+)?/g)) {
    const at = m.index ?? 0;
    const raw = m[0];
    const prev = at === 0 ? ' ' : value[at - 1];
    const next = value[at + raw.length] ?? ' ';
    if (!/[\s#]/.test(prev) || !/[\s+xKkM%,.]/.test(next)) continue;
    const n = Number(raw);
    if (/^(19|20)\d{2}$/.test(raw) || n < 2) continue;
    const decimals = raw.includes('.') ? raw.split('.')[1].length : 0;
    return { before: value.slice(0, at), n, decimals, after: value.slice(at + raw.length) };
  }
  return null;
}
