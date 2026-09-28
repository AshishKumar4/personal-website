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

export function scrollToHash(hash: string, instant = false): boolean {
  const el = document.getElementById(hash.replace('#', ''));
  if (!el) return false;
  const far = Math.abs(el.getBoundingClientRect().top) > window.innerHeight * 3;
  el.scrollIntoView({ behavior: instant || far || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  return true;
}
