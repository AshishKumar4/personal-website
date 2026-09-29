import { describe, expect, test } from 'bun:test';
import type { BlogPost, NotebookDoc } from './types';
import { firstMarkdownImage, postCoverImage } from './post-preview';

const base: BlogPost = { id: 'p', slug: 'p', title: 'P', content: '', author: 'a', createdAt: 0 };
const md = (content: string, extra: Partial<BlogPost> = {}): BlogPost => ({ ...base, content, ...extra });
const nb = (doc: NotebookDoc): BlogPost => ({ ...base, format: 'notebook', content: JSON.stringify(doc) });

describe('firstMarkdownImage', () => {
  test('finds a markdown image with a title', () => {
    expect(firstMarkdownImage('Intro\n\n![Mesh](/api/images/a.png "A mesh")\n\n![b](/b.png)')).toBe('/api/images/a.png');
  });
  test('finds an html img with any quoting', () => {
    expect(firstMarkdownImage('<img width="50%" src="https://x.dev/o.png"/>')).toBe('https://x.dev/o.png');
    expect(firstMarkdownImage("<img src='/s.jpg'>")).toBe('/s.jpg');
    expect(firstMarkdownImage('<img src=/u.webp alt=x>')).toBe('/u.webp');
  });
  test('keeps document order between syntaxes', () => {
    expect(firstMarkdownImage('<img src="/first.png"> then ![x](/second.png)')).toBe('/first.png');
  });
  test('skips badges, data uris, relative paths and fenced code', () => {
    const text = [
      '[![CI](https://img.shields.io/badge/ci-passing-green)](x)',
      '![open](https://colab.research.google.com/assets/colab-badge.svg)',
      '![inline](data:image/png;base64,AAAA)',
      '![rel](images/local.png)',
      '![proto](//cdn.example.com/a.png)',
      '```md\n![code](/in-code.png)\n```',
      '![real](https://cdn.example.com/cover.jpg)',
    ].join('\n\n');
    expect(firstMarkdownImage(text)).toBe('https://cdn.example.com/cover.jpg');
  });
  test('returns null without images', () => {
    expect(firstMarkdownImage('Just [a link](https://example.com) and text.')).toBeNull();
  });
});

describe('postCoverImage', () => {
  test('prefers an explicit cover', () => {
    expect(postCoverImage(md('![a](/a.png)', { coverImage: '/cover.png' }))).toBe('/cover.png');
  });
  test('ignores an unusable explicit cover', () => {
    expect(postCoverImage(md('![a](/a.png)', { coverImage: 'data:image/png;base64,AA' }))).toBe('/a.png');
  });
  test('derives the first markdown image', () => {
    expect(postCoverImage(md('# Title\n\nText\n\n![Mesh](/api/images/sfu/image1.png)'))).toBe('/api/images/sfu/image1.png');
  });
  test('returns null for a post without images', () => {
    expect(postCoverImage(md('# Title\n\nOnly words here.'))).toBeNull();
  });
  test('walks notebook cells in order', () => {
    const doc: NotebookDoc = {
      cells: [
        { kind: 'markdown', source: '# Notebook' },
        { kind: 'code', source: 'plot()', lang: 'python', executionCount: 1, outputs: [{ kind: 'stream', text: 'ok' }, { kind: 'image', url: 'data:image/png;base64,AA', alt: '' }, { kind: 'image', url: '/api/images/nb-0.png', alt: 'plot' }] },
        { kind: 'markdown', source: '![later](/later.png)' },
      ],
    };
    expect(postCoverImage(nb(doc))).toBe('/api/images/nb-0.png');
  });
  test('uses a markdown cell image that comes before outputs', () => {
    const doc: NotebookDoc = {
      cells: [
        { kind: 'markdown', source: '<img src="https://raw.githubusercontent.com/o/r/main/out.png" width="50%"/>' },
        { kind: 'code', source: 'x', lang: 'python', executionCount: 1, outputs: [{ kind: 'image', url: '/api/images/nb-0.png', alt: '' }] },
      ],
    };
    expect(postCoverImage(nb(doc))).toBe('https://raw.githubusercontent.com/o/r/main/out.png');
  });
  test('reads images inside html and markdown outputs', () => {
    const doc: NotebookDoc = {
      cells: [{ kind: 'code', source: 'x', lang: 'python', executionCount: 1, outputs: [{ kind: 'html', html: '<div><img src="/html.png"></div>' }] }],
    };
    expect(postCoverImage(nb(doc))).toBe('/html.png');
  });
  test('survives malformed notebook json', () => {
    expect(postCoverImage({ ...base, format: 'notebook', content: '{nope' })).toBeNull();
  });
  test('does not mutate the post', () => {
    const post = md('![a](/a.png)');
    const before = JSON.stringify(post);
    postCoverImage(post);
    expect(JSON.stringify(post)).toBe(before);
  });
});
