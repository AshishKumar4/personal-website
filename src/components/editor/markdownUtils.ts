import TurndownService from 'turndown';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

turndownService.addRule('codeBlock', {
  filter: (node) => {
    return (
      node.nodeName === 'PRE' &&
      node.firstChild !== null &&
      node.firstChild.nodeName === 'CODE'
    );
  },
  replacement: (content, node) => {
    const codeNode = node.firstChild as HTMLElement;
    const language = codeNode.className?.replace('language-', '') || '';
    const code = codeNode.textContent || '';
    return `\n\`\`\`${language}\n${code}\n\`\`\`\n`;
  },
});

turndownService.addRule('inlineCode', {
  filter: (node) => {
    return node.nodeName === 'CODE' && node.parentNode?.nodeName !== 'PRE';
  },
  replacement: (content) => {
    return `\`${content}\``;
  },
});

export function htmlToMarkdown(html: string): string {
  if (!html || html === '<p></p>') return '';
  return turndownService.turndown(html);
}

export function markdownToHtml(markdown: string): string {
  if (!markdown) return '<p></p>';

  let html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/^> (.*)$/gim, '<blockquote>$1</blockquote>')
    .replace(/^- (.*)$/gim, '<li>$1</li>')
    .replace(/^(\d+)\. (.*)$/gim, '<li>$2</li>');

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang || 'plaintext'}">${escapeHtml(code.trim())}</code></pre>`;
  });

  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType = '';

  for (const line of lines) {
    if (line.startsWith('<li>')) {
      if (!inList) {
        listType = 'ul';
        result.push('<ul>');
        inList = true;
      }
      result.push(line);
    } else {
      if (inList) {
        result.push(`</${listType}>`);
        inList = false;
      }
      if (line.trim() && !line.startsWith('<')) {
        result.push(`<p>${line}</p>`);
      } else if (line.trim()) {
        result.push(line);
      }
    }
  }

  if (inList) {
    result.push(`</${listType}>`);
  }

  return result.join('\n') || '<p></p>';
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
