import { describe, it, expect } from 'bun:test';
import { notebookToMarkdown } from './notebook-convert';

describe('notebookToMarkdown', () => {
  it('passes markdown cells through unchanged', () => {
    const nb = {
      cells: [{ cell_type: 'markdown', source: ['# Title\n', '\n', 'Some **text**.'] }],
      metadata: { language_info: { name: 'python' } },
    };
    const { markdown, images } = notebookToMarkdown(nb);
    expect(markdown).toContain('# Title');
    expect(markdown).toContain('Some **text**.');
    expect(images).toHaveLength(0);
  });

  it('fences code cells with the notebook language', () => {
    const nb = {
      cells: [{ cell_type: 'code', source: 'print("hi")', outputs: [] }],
      metadata: { language_info: { name: 'python' } },
    };
    const { markdown } = notebookToMarkdown(nb);
    expect(markdown).toContain('```python\nprint("hi")\n```');
  });

  it('renders stream output as a text block', () => {
    const nb = {
      cells: [
        {
          cell_type: 'code',
          source: 'x=1',
          outputs: [{ output_type: 'stream', name: 'stdout', text: ['epoch 1\n', 'epoch 2\n'] }],
        },
      ],
    };
    const { markdown } = notebookToMarkdown(nb);
    expect(markdown).toContain('```text\nepoch 1\nepoch 2\n```');
  });

  it('extracts image outputs into placeholders + data URIs', () => {
    const nb = {
      cells: [
        {
          cell_type: 'code',
          source: 'plot()',
          outputs: [
            { output_type: 'display_data', data: { 'image/png': 'AAAABBBB' } },
          ],
        },
      ],
    };
    const { markdown, images } = notebookToMarkdown(nb);
    expect(images).toHaveLength(1);
    expect(images[0].placeholder).toBe('nb-image-0');
    expect(images[0].ext).toBe('png');
    expect(images[0].dataUri).toBe('data:image/png;base64,AAAABBBB');
    expect(markdown).toContain('![output](nb-image-0)');
  });

  it('prefers image over text/plain in the same output, and strips base64 whitespace', () => {
    const nb = {
      cells: [
        {
          cell_type: 'code',
          source: 'fig',
          outputs: [
            {
              output_type: 'execute_result',
              data: { 'text/plain': '<Figure>', 'image/png': ['AAAA\n', 'BBBB\n'] },
            },
          ],
        },
      ],
    };
    const { markdown, images } = notebookToMarkdown(nb);
    expect(images).toHaveLength(1);
    expect(images[0].dataUri).toBe('data:image/png;base64,AAAABBBB');
    expect(markdown).not.toContain('<Figure>');
  });

  it('renders text/plain results when there is no image', () => {
    const nb = {
      cells: [
        {
          cell_type: 'code',
          source: '2+2',
          outputs: [{ output_type: 'execute_result', data: { 'text/plain': '4' } }],
        },
      ],
    };
    const { markdown } = notebookToMarkdown(nb);
    expect(markdown).toContain('```text\n4\n```');
  });

  it('accepts a JSON string as input', () => {
    const json = JSON.stringify({ cells: [{ cell_type: 'markdown', source: 'hello' }] });
    const { markdown } = notebookToMarkdown(json);
    expect(markdown).toContain('hello');
  });

  it('escapes fences when code contains triple backticks', () => {
    const nb = {
      cells: [{ cell_type: 'code', source: 'md = "```py\\nx\\n```"' }],
      metadata: { language_info: { name: 'python' } },
    };
    const { markdown } = notebookToMarkdown(nb);
    expect(markdown).toContain('````python');
  });

  it('drops empty cells and error outputs without crashing', () => {
    const nb = {
      cells: [
        { cell_type: 'code', source: '', outputs: [{ output_type: 'error', text: 'boom' }] },
        { cell_type: 'raw', source: 'ignored' },
      ],
    };
    const { markdown, images } = notebookToMarkdown(nb);
    expect(images).toHaveLength(0);
    expect(markdown.trim()).toBe('');
  });
});
