import { expect, test, describe } from 'bun:test';
import { DEFAULT_STORY } from '@shared/types';
import { parseStory } from './story';

const chapter = (extra: Record<string, unknown> = {}) => ({
  id: 'one',
  scene: 'kernel',
  era: ' Age 15 ',
  title: ' One hour a day. ',
  body: 'First.\r\n\r\nSecond.',
  highlights: [{ label: 'OS', value: 'Aqeous' }, { label: '', value: '' }],
  links: [{ label: 'GitHub', url: 'https://github.com/AshishKumar4/Aqeous' }],
  ...extra,
});

describe('parseStory', () => {
  test('accepts the default story unchanged', () => {
    expect(parseStory(DEFAULT_STORY)).toEqual(DEFAULT_STORY);
  });

  test('trims strings, normalizes newlines and drops empty rows', () => {
    const [c] = parseStory([chapter()]);
    expect(c.era).toBe('Age 15');
    expect(c.title).toBe('One hour a day.');
    expect(c.body).toBe('First.\n\nSecond.');
    expect(c.highlights).toEqual([{ label: 'OS', value: 'Aqeous' }]);
  });

  test('derives unique ids', () => {
    const story = parseStory([chapter({ id: '' }), chapter({ id: '' })]);
    expect(story[0].id).toBe('one-hour-a-day');
    expect(story[1].id).not.toBe(story[0].id);
  });

  test('rejects invalid input', () => {
    expect(() => parseStory('nope')).toThrow();
    expect(() => parseStory(Array.from({ length: 9 }, () => chapter()))).toThrow(/at most 8/);
    expect(() => parseStory([chapter({ scene: 'space' })])).toThrow(/scene/);
    expect(() => parseStory([chapter({ title: '  ' })])).toThrow(/title/);
    expect(() => parseStory([chapter({ body: 'x'.repeat(5000) })])).toThrow(/at most/);
    expect(() => parseStory([chapter({ highlights: Array.from({ length: 5 }, () => ({ label: 'a', value: 'b' })) })])).toThrow(/highlights/);
    expect(() => parseStory([chapter({ highlights: [{ label: 'a', value: '' }] })])).toThrow(/label and a value/);
    expect(() => parseStory([chapter({ links: [{ label: 'x', url: 'http://example.com' }] })])).toThrow(/https/);
    expect(() => parseStory([chapter({ links: [{ label: 'x', url: 'javascript:alert(1)' }] })])).toThrow(/https/);
    expect(() => parseStory([chapter({ links: Array.from({ length: 5 }, () => ({ label: 'a', url: 'https://a.b' })) })])).toThrow(/links/);
  });
});
