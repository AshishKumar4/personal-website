const INTERACTIVE = 'a,button,input,textarea,select,label,summary,video,audio,iframe,[role=button],[role=link],[role=slider],[role=tab],[role=menuitem],[contenteditable=""],[contenteditable=true],[data-no-flight]';

function isInteractive(t: EventTarget | null): boolean {
  const el = t instanceof Element ? t : null;
  return !!el?.closest(INTERACTIVE);
}

function hasSelection(): boolean {
  const s = window.getSelection();
  return !!s && !s.isCollapsed && s.toString().trim().length > 0;
}

export class FlightInput {
  mx = 0;
  my = 0;
  px = -1;
  py = -1;
  hover = false;
  private press: { id: number; x: number; y: number; t: number; moved: boolean } | null = null;
  private cleanup: (() => void)[] = [];

  constructor(private ripple: (x: number, y: number, strength: number) => void, private enabled: boolean) {
    const on = <K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void) => {
      window.addEventListener(type, fn, { passive: true });
      this.cleanup.push(() => window.removeEventListener(type, fn));
    };
    on('pointermove', this.onMove);
    on('pointerdown', this.onDown);
    on('pointerup', this.onUp);
    on('pointercancel', this.cancel);
    on('blur', this.onBlur);
    const leave = (e: MouseEvent) => {
      if (!e.relatedTarget) this.hover = false;
    };
    document.addEventListener('mouseout', leave);
    this.cleanup.push(() => document.removeEventListener('mouseout', leave));
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
    if (p && p.id === e.pointerId && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) p.moved = true;
  };

  private onDown = (e: PointerEvent) => {
    if (!this.enabled || !e.isPrimary || e.button > 0 || isInteractive(e.target)) return;
    this.press = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
  };

  private onUp = (e: PointerEvent) => {
    const p = this.press;
    this.press = null;
    if (!p || p.id !== e.pointerId || p.moved || performance.now() - p.t > 400) return;
    if (hasSelection() || isInteractive(e.target)) return;
    this.ripple(e.clientX, e.clientY, 1);
  };

  private cancel = () => {
    this.press = null;
  };

  private onBlur = () => {
    this.press = null;
    this.hover = false;
  };

  dispose() {
    this.cleanup.forEach(fn => fn());
  }
}
