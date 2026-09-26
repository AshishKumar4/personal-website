type Handler = () => void;

const commandMenuHandlers = new Set<Handler>();
const terminalHandlers = new Set<Handler>();

export function openCommandMenu() {
  commandMenuHandlers.forEach(h => h());
}

export function onOpenCommandMenu(handler: Handler): () => void {
  commandMenuHandlers.add(handler);
  return () => commandMenuHandlers.delete(handler);
}

export function openTerminal() {
  terminalHandlers.forEach(h => h());
}

export function onOpenTerminal(handler: Handler): () => void {
  terminalHandlers.add(handler);
  return () => terminalHandlers.delete(handler);
}

export function scrollToHash(hash: string) {
  const el = document.getElementById(hash.replace('#', ''));
  if (el) el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}
