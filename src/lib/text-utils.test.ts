import { paragraphize } from './text-utils';
import { expect, test } from 'bun:test';
test('paragraphize turns hard breaks between prose lines into paragraphs', () => {
  expect(paragraphize('Long line one.   \nNext para.')).toBe('Long line one.\n\nNext para.');
  expect(paragraphize('```\ncode   \nmore\n```\nx')).toBe('```\ncode   \nmore\n```\nx');
  expect(paragraphize('item:   \n- a\n- b')).toBe('item:   \n- a\n- b');
  expect(paragraphize('| a |   \n| b |')).toBe('| a |   \n| b |');
});
