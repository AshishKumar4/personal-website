import { emitFlight } from './bus';

const INTERACTIVE = 'a,button,input,textarea,select,label,summary,video,audio,iframe,[role=button],[role=link],[role=slider],[role=tab],[role=menuitem],[contenteditable=""],[contenteditable=true],[data-no-flight]';
const TYPING = 'input,textarea,select,[contenteditable=""],[contenteditable=true]';

function isInteractive(t: EventTarget | null, sel = INTERACTIVE): boolean {
  const el = t instanceof Element ? t : null;
  return !!el?.closest(sel);
}

function hasSelection(): boolean {
  const s = window.getSelection();
  return !!s && !s.isCollapsed && s.toString().trim().length > 0;
}

export interface InputHandlers {
  ripple(x: number, y: number, strength: number): void;
}

export class FlightInput {
  mx = 0;
  my = 0;
  px = -1;
  py = -1;
  hover = false;
  pressBoost = false;
  keyBoost = false;
  free = false;
  keys = new Set<string>();
  private press: { id: number; x: number; y: number; t: number; timer: number; moved: boolean } | null = null;
  private cleanup: (() => void)[] = [];

  constructor(private h: InputHandlers, private enabled: boolean) {
    const on = <K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void, opts: AddEventListenerOptions = { passive: true }) => {
      window.addEventListener(type, fn, opts);
      this.cleanup.push(() => window.removeEventListener(type, fn, opts));
    };
    on('pointermove', this.onMove);
    on('pointerdown', this.onDown);
    on('pointerup', this.onUp);
    on('pointercancel', this.cancelPress);
    on('blur', this.onBlur);
    on('keydown', this.onKeyDown, { passive: false });
    on('keyup', this.onKeyUp);
    const leave = (e: MouseEvent) => {
      if (!e.relatedTarget) this.hover = false;
    };
    document.addEventListener('mouseout', leave);
    const sel = () => {
      if (this.pressBoost && hasSelection()) this.cancelPress();
    };
    document.addEventListener('selectionchange', sel);
    this.cleanup.push(() => {
      document.removeEventListener('mouseout', leave);
      document.removeEventListener('selectionchange', sel);
    });
  }

  get boosting(): boolean {
    return this.pressBoost || this.keyBoost;
  }

  private onMove = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      this.mx = (e.clientX / window.innerWidth) * 2 - 1;
      this.my = (e.clientY / window.innerHeight) * 2 - 1;
      this.px = e.clientX;
      this.py = e.clientY;
      this.hover = true;
    }
    const p = this.press;
    if (p && p.id === e.pointerId && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) {
      p.moved = true;
      if (!this.pressBoost) this.cancelPress();
    }
  };

  private onDown = (e: PointerEvent) => {
    if (!this.enabled || !e.isPrimary || e.button > 0) return;
    if (isInteractive(e.target)) return;
    this.cancelPress();
    const p = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), timer: 0, moved: false };
    p.timer = window.setTimeout(() => {
      if (this.press === p && !p.moved && !hasSelection()) this.pressBoost = true;
    }, 250);
    this.press = p;
  };

  private onUp = (e: PointerEvent) => {
    const p = this.press;
    if (!p || p.id !== e.pointerId) return;
    const short = performance.now() - p.t < 250 && !this.pressBoost;
    const ok = short && !p.moved && !hasSelection() && !isInteractive(e.target);
    this.cancelPress();
    if (ok) this.h.ripple(e.clientX, e.clientY, 1);
  };

  private cancelPress = () => {
    if (this.press) clearTimeout(this.press.timer);
    this.press = null;
    this.pressBoost = false;
  };

  private onBlur = () => {
    this.cancelPress();
    this.keyBoost = false;
    this.keys.clear();
    this.hover = false;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.enabled || e.metaKey || e.ctrlKey || e.altKey) return;
    const typing = isInteractive(e.target, TYPING) || isInteractive(document.activeElement, TYPING);
    if (typing) return;
    if (e.code === 'Space') {
      if (isInteractive(e.target) && !this.free) return;
      e.preventDefault();
      this.keyBoost = true;
      return;
    }
    if (!this.free) return;
    if (e.key === 'Escape') {
      emitFlight('free', false);
      return;
    }
    const k = this.keyName(e.code);
    if (k) {
      e.preventDefault();
      this.keys.add(k);
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') this.keyBoost = false;
    const k = this.keyName(e.code);
    if (k) this.keys.delete(k);
  };

  private keyName(code: string): string | null {
    switch (code) {
      case 'ArrowLeft': case 'KeyA': return 'left';
      case 'ArrowRight': case 'KeyD': return 'right';
      case 'ArrowUp': case 'KeyW': return 'up';
      case 'ArrowDown': case 'KeyS': return 'down';
      default: return null;
    }
  }

  axis(neg: string, pos: string): number {
    return (this.keys.has(pos) ? 1 : 0) - (this.keys.has(neg) ? 1 : 0);
  }

  dispose() {
    this.cancelPress();
    this.cleanup.forEach(fn => fn());
  }
}
