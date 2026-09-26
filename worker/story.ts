import { SCENE_IDS } from "@shared/types";
import type { StoryChapter } from "@shared/types";

export const STORY_LIMITS = { chapters: 8, highlights: 4, links: 4, id: 64, era: 60, title: 140, body: 4000, label: 60, value: 80, url: 500 };

function storyString(value: unknown, max: number, field: string): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new Error(`${field} must be at most ${max} characters`);
  return trimmed;
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function slugifyChapter(title: string, index: number): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
  return slug || `chapter-${index + 1}`;
}

export function parseStory(value: unknown): StoryChapter[] {
  if (!Array.isArray(value)) throw new Error('story must be a list of chapters');
  if (value.length > STORY_LIMITS.chapters) throw new Error(`story can have at most ${STORY_LIMITS.chapters} chapters`);
  const seen = new Set<string>();
  return value.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error(`chapter ${index + 1} is invalid`);
    const chapter = raw as Record<string, unknown>;
    const at = `chapter ${index + 1}`;
    if (!SCENE_IDS.includes(chapter.scene as StoryChapter['scene'])) throw new Error(`${at}: unknown scene`);
    const title = storyString(chapter.title, STORY_LIMITS.title, `${at} title`);
    if (!title) throw new Error(`${at}: title is required`);
    const era = storyString(chapter.era, STORY_LIMITS.era, `${at} era`);
    const body = storyString(chapter.body, STORY_LIMITS.body, `${at} body`).replace(/\r\n/g, '\n');
    const highlightsRaw = chapter.highlights ?? [];
    if (!Array.isArray(highlightsRaw)) throw new Error(`${at}: highlights must be a list`);
    const highlights = highlightsRaw
      .map((h, i) => ({
        label: storyString((h as { label?: unknown; value?: unknown } | null)?.label, STORY_LIMITS.label, `${at} highlight ${i + 1} label`),
        value: storyString((h as { label?: unknown; value?: unknown } | null)?.value, STORY_LIMITS.value, `${at} highlight ${i + 1} value`),
      }))
      .filter(h => h.label || h.value);
    if (highlights.length > STORY_LIMITS.highlights) throw new Error(`${at}: at most ${STORY_LIMITS.highlights} highlights`);
    if (highlights.some(h => !h.label || !h.value)) throw new Error(`${at}: each highlight needs a label and a value`);
    const linksRaw = chapter.links ?? [];
    if (!Array.isArray(linksRaw)) throw new Error(`${at}: links must be a list`);
    const links = linksRaw
      .map((l, i) => ({
        label: storyString((l as { label?: unknown } | null)?.label, STORY_LIMITS.label, `${at} link ${i + 1} label`),
        url: storyString((l as { url?: unknown } | null)?.url, STORY_LIMITS.url, `${at} link ${i + 1} url`),
      }))
      .filter(l => l.label || l.url);
    if (links.length > STORY_LIMITS.links) throw new Error(`${at}: at most ${STORY_LIMITS.links} links`);
    if (links.some(l => !l.label || !isHttpsUrl(l.url))) throw new Error(`${at}: each link needs a label and an https URL`);
    let id = storyString(chapter.id, STORY_LIMITS.id, `${at} id`).toLowerCase().replace(/[^a-z0-9-]+/g, '-') || slugifyChapter(title, index);
    while (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    return { id, scene: chapter.scene as StoryChapter['scene'], era, title, body, highlights, ...(links.length ? { links } : {}) };
  });
}
