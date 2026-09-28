import { useEffect, useRef, useState, type RefObject } from 'react';

export interface TocItem {
  id: string;
  text: string;
  level: 0 | 1;
  parent: string | null;
}

function headingText(h: HTMLElement) {
  const clone = h.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('.katex-mathml, .heading-anchor').forEach(n => n.remove());
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function collect(root: HTMLElement) {
  const all = Array.from(root.querySelectorAll<HTMLElement>('.prose-styles h1, .prose-styles h2, .prose-styles h3')).filter(
    h => !h.closest('.nb-outputs, .code-frame, .table-wrap'),
  );
  const levels = Array.from(new Set(all.map(h => Number(h.tagName[1])))).sort();
  const top = levels.slice(0, 2);
  const seen = new Set<string>();
  const heads: HTMLElement[] = [];
  const items: TocItem[] = [];
  let parent: string | null = null;
  for (const h of all) {
    let id = h.id || headingText(h).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!id) continue;
    const baseId = id;
    let n = 2;
    while (seen.has(id)) id = `${baseId}-${n++}`;
    seen.add(id);
    if (h.id !== id) {
      h.id = id;
      const a = h.querySelector<HTMLAnchorElement>('.heading-anchor');
      if (a) a.setAttribute('href', `#${id}`);
    }
    const lvl = top.indexOf(Number(h.tagName[1]));
    if (lvl === -1) continue;
    const level = (lvl === 1 && parent === null ? 0 : lvl) as 0 | 1;
    if (level === 0) parent = id;
    heads.push(h);
    items.push({ id, text: headingText(h), level, parent: level === 0 ? null : parent });
  }
  return { heads, items };
}

export function useArticleNav(rootRef: RefObject<HTMLElement>, ready: unknown, minutes: number) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [left, setLeft] = useState(minutes);
  const [inBody, setInBody] = useState(false);
  const [done, setDone] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const headsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !ready) return;
    let raf = 0;
    const run = () => {
      const { heads, items: next } = collect(root);
      headsRef.current = heads;
      setItems(next);
    };
    run();
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(run);
    });
    mo.observe(root, { childList: true, subtree: true });
    const t = window.setTimeout(() => mo.disconnect(), 4000);
    return () => {
      mo.disconnect();
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [rootRef, ready]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const root = rootRef.current;
      if (!root) return;
      const vh = window.innerHeight;
      const rect = root.getBoundingClientRect();
      const total = rect.height - vh * 0.55;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      setLeft(Math.max(0, Math.ceil(minutes * (1 - p))));
      setInBody(rect.top < vh * 0.35);
      setDone(rect.bottom < vh * 0.9);
      const line = Math.min(160, vh * 0.22);
      let current: string | null = null;
      for (const h of headsRef.current) {
        if (h.getBoundingClientRect().top - line <= 0) current = h.id;
        else break;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rootRef, minutes, items]);

  return { items, active, left, inBody, done, barRef };
}

export function scrollToHeading(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const top = el.getBoundingClientRect().top + window.scrollY - 96;
  window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
  history.replaceState(history.state, '', `#${id}`);
}
