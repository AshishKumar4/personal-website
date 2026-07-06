import { describe, it, expect } from 'bun:test';
import { parseNotebook, notebookTitle } from './notebook-parse';

describe('parseNotebook', () => {
  it('keeps cell structure: markdown and code cells', () => {
    const { notebook } = parseNotebook({
      cells: [
        { cell_type: 'markdown', source: '# Title\n\nText.' },
        { cell_type: 'code', source: 'print(1)', execution_count: 3, outputs: [] },
      ],
      metadata: { language_info: { name: 'python' } },
    });
    expect(notebook.cells).toHaveLength(2);
    expect(notebook.cells[0]).toEqual({ kind: 'markdown', source: '# Title\n\nText.' });
    expect(notebook.cells[1]).toMatchObject({ kind: 'code', source: 'print(1)', lang: 'python', executionCount: 3 });
  });

  it('normalizes stream, text, html, markdown and image outputs', () => {
    const { notebook, images } = parseNotebook({
      cells: [
        {
          cell_type: 'code',
          source: 'run()',
          outputs: [
            { output_type: 'stream', name: 'stdout', text: ['epoch 1\n', 'epoch 2\n'] },
            { output_type: 'execute_result', data: { 'text/plain': '42' } },
            { output_type: 'display_data', data: { 'text/html': '<table><tr><td>x</td></tr></table>' } },
            { output_type: 'display_data', data: { 'image/png': 'AAAA' } },
          ],
        },
      ],
    });
    const cell = notebook.cells[0];
    if (cell.kind !== 'code') throw new Error('expected code cell');
    expect(cell.outputs[0]).toEqual({ kind: 'stream', text: 'epoch 1\nepoch 2' });
    expect(cell.outputs[1]).toEqual({ kind: 'text', text: '42' });
    expect(cell.outputs[2]).toEqual({ kind: 'html', html: '<table><tr><td>x</td></tr></table>' });
    expect(cell.outputs[3]).toMatchObject({ kind: 'image', alt: 'output' });
    expect(images).toHaveLength(1);
    expect(images[0].dataUri).toBe('data:image/png;base64,AAAA');
    // the image output url is the placeholder until the caller swaps it
    expect((cell.outputs[3] as { url: string }).url).toBe(images[0].placeholder);
  });

  it('prefers image over text/plain in the same output', () => {
    const { notebook, images } = parseNotebook({
      cells: [{ cell_type: 'code', source: 'fig', outputs: [
        { output_type: 'execute_result', data: { 'text/plain': '<Figure>', 'image/png': 'BBBB' } },
      ] }],
    });
    const cell = notebook.cells[0];
    if (cell.kind !== 'code') throw new Error('expected code cell');
    expect(cell.outputs).toHaveLength(1);
    expect(cell.outputs[0].kind).toBe('image');
    expect(images).toHaveLength(1);
  });

  it('captures colab url and strips the badge from markdown', () => {
    const { notebook } = parseNotebook({
      cells: [{ cell_type: 'markdown', source:
        '<a href="https://colab.research.google.com/github/AshishKumar4/FlaxDiff/blob/main/x.ipynb"><img src="https://colab.research.google.com/assets/colab-badge.svg"/></a>\n\n# Real' }],
    });
    expect(notebook.colabUrl).toBe('https://colab.research.google.com/github/AshishKumar4/FlaxDiff/blob/main/x.ipynb');
    const cell = notebook.cells[0];
    if (cell.kind !== 'markdown') throw new Error('expected markdown cell');
    expect(cell.source).toBe('# Real');
  });

  it('drops empty code cells and accepts a JSON string', () => {
    const { notebook } = parseNotebook(JSON.stringify({
      cells: [
        { cell_type: 'code', source: '', outputs: [] },
        { cell_type: 'markdown', source: 'hi' },
      ],
    }));
    expect(notebook.cells).toHaveLength(1);
    expect(notebook.cells[0]).toEqual({ kind: 'markdown', source: 'hi' });
  });

  it('rewrites repo-relative images to raw-GitHub URLs using the Colab repo', () => {
    const { notebook } = parseNotebook({
      cells: [
        { cell_type: 'markdown', source:
          '<a href="https://colab.research.google.com/github/AshishKumar4/FlaxDiff/blob/main/tutorial%20notebooks/x.ipynb"></a>' },
        { cell_type: 'markdown', source: 'Look: <img src="../images/output.png" width="50%"/> and ![](./local.png)' },
      ],
    });
    const cell = notebook.cells[0];
    if (cell.kind !== 'markdown') throw new Error('expected markdown cell');
    expect(cell.source).toContain('https://raw.githubusercontent.com/AshishKumar4/FlaxDiff/main/images/output.png');
    expect(cell.source).toContain('https://raw.githubusercontent.com/AshishKumar4/FlaxDiff/main/tutorial%20notebooks/local.png');
  });

  it('leaves absolute and data image URLs untouched', () => {
    const { notebook } = parseNotebook({
      cells: [
        { cell_type: 'markdown', source:
          '<a href="https://colab.research.google.com/github/o/r/blob/main/n.ipynb"></a>' },
        { cell_type: 'markdown', source: '![](https://x.com/a.png) and <img src="data:image/png;base64,AAA"/>' },
      ],
    });
    const cell = notebook.cells[0];
    if (cell.kind !== 'markdown') throw new Error('expected markdown cell');
    expect(cell.source).toContain('https://x.com/a.png');
    expect(cell.source).toContain('data:image/png;base64,AAA');
    expect(cell.source).not.toContain('raw.githubusercontent');
  });

  it('strips ANSI escape codes from stream output but keeps real brackets', () => {
    const { notebook } = parseNotebook({
      cells: [{ cell_type: 'code', source: 'pip', outputs: [
        { output_type: 'stream', name: 'stdout', text: '\u001b[33mDEPRECATION\u001b[0m installing flax[all]\n' },
      ] }],
    });
    const cell = notebook.cells[0];
    if (cell.kind !== 'code') throw new Error('expected code cell');
    const out = cell.outputs[0];
    expect(out.kind).toBe('stream');
    expect((out as { text: string }).text).toBe('DEPRECATION installing flax[all]');
  });

  it('merges consecutive stream outputs into one block', () => {
    const { notebook } = parseNotebook({
      cells: [{ cell_type: 'code', source: 'train()', outputs: [
        { output_type: 'stream', name: 'stdout', text: 'Epoch 1\n' },
        { output_type: 'stream', name: 'stderr', text: 'Epoch 1: 600step\n' },
        { output_type: 'stream', name: 'stdout', text: 'Epoch 2\n' },
      ] }],
    });
    const cell = notebook.cells[0];
    if (cell.kind !== 'code') throw new Error('expected code cell');
    expect(cell.outputs).toHaveLength(1);
    expect(cell.outputs[0]).toEqual({ kind: 'stream', text: 'Epoch 1\nEpoch 1: 600step\nEpoch 2' });
  });

  it('does not merge streams across an image output', () => {
    const { notebook } = parseNotebook({
      cells: [{ cell_type: 'code', source: 'x', outputs: [
        { output_type: 'stream', name: 'stdout', text: 'before' },
        { output_type: 'display_data', data: { 'image/png': 'AAAA' } },
        { output_type: 'stream', name: 'stdout', text: 'after' },
      ] }],
    });
    const cell = notebook.cells[0];
    if (cell.kind !== 'code') throw new Error('expected code cell');
    expect(cell.outputs.map((o) => o.kind)).toEqual(['stream', 'image', 'stream']);
  });

  it('turns anchor-target image syntax into a plain link and never absolutizes anchors', () => {
    const { notebook } = parseNotebook({
      cells: [
        { cell_type: 'markdown', source:
          '<a href="https://colab.research.google.com/github/o/r/blob/main/n.ipynb"></a>' },
        { cell_type: 'markdown', source:
          'see our ![Noise Schedulers](#Cosine-Noise-Scheduler-in-terms-of-$%5Cbeta(t)$) sections' },
      ],
    });
    const cell = notebook.cells[0];
    if (cell.kind !== 'markdown') throw new Error('expected markdown cell');
    expect(cell.source).toContain('[Noise Schedulers](#Cosine-Noise-Scheduler');
    expect(cell.source).not.toContain('![Noise Schedulers]');
    expect(cell.source).not.toContain('raw.githubusercontent');
  });

  it('notebookTitle returns the first H1', () => {
    expect(notebookTitle({ cells: [
      { kind: 'markdown', source: 'intro' },
      { kind: 'markdown', source: '# The Title\nmore' },
    ] })).toBe('The Title');
    expect(notebookTitle({ cells: [] })).toBeUndefined();
  });
});
