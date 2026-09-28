export function getReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function createSnippet(text: string | undefined, maxLength: number = 100): string {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function paragraphize(markdown: string): string {
  return markdown
    .split(/(^```[\s\S]*?^```[^\n]*$)/m)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(/([^\s|])[ \t]{2,}\n(?=[^\s\n|>*\-#\d`])/g, '$1\n\n')))
    .join('');
}
