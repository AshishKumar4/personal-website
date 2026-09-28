import { useEffect, useRef, useState, type Ref } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { scrollToHeading, type TocItem } from './useArticleNav';
import { ReaderControls } from './ReaderControls';
import type { useReaderPrefs } from './reader-prefs';

type Prefs = ReturnType<typeof useReaderPrefs>;

function activeParent(items: TocItem[], active: string | null) {
  const hit = items.find(i => i.id === active);
  if (!hit) return null;
  return hit.level === 0 ? hit.id : hit.parent;
}

function TocList({ items, active, onPick, expandAll = false, listRef }: { items: TocItem[]; active: string | null; onPick?: () => void; expandAll?: boolean; listRef?: Ref<HTMLOListElement> }) {
  const open = activeParent(items, active);
  const tops = items.filter(i => i.level === 0);
  let n = 0;
  return (
    <ol ref={listRef} className="toc-list">
      {items.map(item => {
        if (item.level === 1 && !expandAll && item.parent !== open) return null;
        const isActive = item.id === active || (item.level === 0 && item.id === open && active !== item.id);
        const num = item.level === 0 ? ++n : null;
        return (
          <li key={item.id} className={cn(item.level === 1 && 'is-sub')}>
            <a
              href={`#${item.id}`}
              data-id={item.id}
              aria-current={item.id === active ? 'location' : undefined}
              className={cn('toc-link', item.id === active && 'is-active', isActive && item.id !== active && 'is-parent')}
              onClick={e => {
                e.preventDefault();
                scrollToHeading(item.id);
                onPick?.();
              }}
            >
              {num != null && tops.length > 1 && <span className="toc-num">{String(num).padStart(2, '0')}</span>}
              <span className="toc-text">{item.text}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

export function TocRail({ items, active, left, prefs }: { items: TocItem[]; active: string | null; left: number; prefs: Prefs }) {
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    if (!list || !active) return;
    const el = list.querySelector<HTMLElement>(`[data-id="${CSS.escape(active)}"]`);
    if (!el) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < list.scrollTop + 24) list.scrollTop = Math.max(0, top - 48);
    else if (bottom > list.scrollTop + list.clientHeight - 24) list.scrollTop = bottom - list.clientHeight + 48;
  }, [active]);

  return (
    <nav aria-label="Contents" className="toc-rail">
      {items.length > 1 && (
        <>
          <div className="toc-label">Contents</div>
          <TocList items={items} active={active} listRef={listRef} />
        </>
      )}
      <div className="toc-foot">
        <ReaderControls prefs={prefs} side="top" align="start" />
        <span className="toc-left tabular" aria-live="off">{left > 0 ? `${left} min left` : 'Finished'}</span>
      </div>
    </nav>
  );
}

export function ReaderDock({ items, active, visible, prefs }: { items: TocItem[]; active: string | null; visible: boolean; prefs: Prefs }) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    last.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const d = y - last.current;
      if (Math.abs(d) < 10) return;
      setHidden(d > 0);
      last.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const tops = items.filter(i => i.level === 0);
  const parent = activeParent(items, active);
  const idx = tops.findIndex(t => t.id === parent);
  const current = idx >= 0 ? tops[idx] : null;
  const show = visible && (!hidden || open);

  return (
    <div className={cn('reader-dock', show ? 'is-shown' : 'is-hidden')} aria-hidden={!show}>
      {tops.length > 1 && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button type="button" className="reader-dock-toc" tabIndex={show ? 0 : -1} aria-label="Contents">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0 opacity-70">
                <path d="M1 3h12M1 7h8M1 11h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
              </svg>
              <span className="reader-dock-num tabular">{current ? `${String(idx + 1).padStart(2, '0')}/${String(tops.length).padStart(2, '0')}` : 'Contents'}</span>
              {current && <span className="reader-dock-title">{current.text}</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="center" sideOffset={12} collisionPadding={12} className="reader-pop toc-pop">
            <div className="toc-label">Contents</div>
            <TocList items={items} active={active} onPick={() => setOpen(false)} />
          </PopoverContent>
        </Popover>
      )}
      <ReaderControls prefs={prefs} side="top" align="end" className="reader-dock-aa" />
    </div>
  );
}
