import { useState, type ReactNode } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Archive, Trash2 } from 'lucide-react';

interface SwipeActionsProps {
  onArchive?: () => void;
  onTrash?: () => void;
  children: ReactNode;
}

const THRESHOLD = 80;

/**
 * Touch swipe wrapper for list rows: swipe right to archive, left to trash.
 * Mouse is not tracked, so desktop clicks and hover actions are unaffected.
 */
export function SwipeActions({ onArchive, onTrash, children }: SwipeActionsProps) {
  const [dx, setDx] = useState(0);

  const handlers = useSwipeable({
    onSwiping: (e) => {
      const clamped = Math.max(-140, Math.min(140, e.deltaX));
      setDx((onArchive && clamped > 0) || (onTrash && clamped < 0) ? clamped : 0);
    },
    onSwipedRight: (e) => { if (onArchive && e.deltaX > THRESHOLD) onArchive(); setDx(0); },
    onSwipedLeft: (e) => { if (onTrash && Math.abs(e.deltaX) > THRESHOLD) onTrash(); setDx(0); },
    onSwiped: () => setDx(0),
    trackMouse: false,
    preventScrollOnSwipe: true,
    delta: 24,
  });

  return (
    <div className="relative overflow-hidden">
      {dx > 0 && (
        <div className="absolute inset-y-0 left-0 flex items-center px-4 bg-primary/15 text-primary" style={{ width: dx }}>
          <Archive className="h-5 w-5" />
        </div>
      )}
      {dx < 0 && (
        <div className="absolute inset-y-0 right-0 flex items-center justify-end px-4 bg-destructive/15 text-destructive" style={{ width: -dx }}>
          <Trash2 className="h-5 w-5" />
        </div>
      )}
      <div
        {...handlers}
        style={{ transform: `translateX(${dx}px)`, transition: dx === 0 ? 'transform 0.2s ease' : undefined }}
        className="relative bg-background"
      >
        {children}
      </div>
    </div>
  );
}
