export interface Palette {
  bg: string;
  fg: string;
  signal: string;
  muted: string;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HeroLayout {
  w: number;
  h: number;
  mode: 'wide' | 'tall';
  padX: number;
  lines: string[];
  fontSize: number;
  lineHeight: number;
  nameTop: number;
  nameBottom: number;
  nameWidth: number;
  portrait: Rect;
}

export const SERIF = '"Instrument Serif", Georgia, serif';
export const MONO = '"Geist Mono Variable", ui-monospace, monospace';
const TRACKING = -0.02;

let measureCtx: CanvasRenderingContext2D | null = null;

function measure(text: string, fontSize: number): number {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  const ctx = measureCtx!;
  ctx.font = `400 ${fontSize}px ${SERIF}`;
  return ctx.measureText(text).width + TRACKING * fontSize * Math.max(0, text.length - 1);
}

export function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => `hsl(${css.getPropertyValue(name).trim()})`;
  return { bg: v('--background'), fg: v('--foreground'), signal: v('--signal'), muted: v('--muted-foreground') };
}

export function containerPad(w: number): number {
  if (w >= 1024) return 48;
  if (w >= 640) return 32;
  return 20;
}

export function heroLayout(w: number, h: number, name: string[]): HeroLayout {
  const padX = containerPad(w);
  const wide = w >= 768 && w / h >= 0.95;
  if (wide) {
    const lines = [name[0], name.slice(1).join(' ')];
    const avail = w * 0.66 - padX;
    const widest = Math.max(...lines.map(l => measure(l, 100)));
    const fontSize = Math.min((avail / widest) * 100, h * 0.215, 260);
    const lineHeight = fontSize * 0.9;
    const blockH = lineHeight * lines.length;
    const nameTop = Math.max(h * 0.44 - blockH / 2, 88);
    const px = w * 0.44;
    return {
      w, h, mode: 'wide', padX, lines, fontSize, lineHeight,
      nameTop, nameBottom: nameTop + blockH, nameWidth: (widest * fontSize) / 100,
      portrait: { x: px, y: 0, w: w - px, h },
    };
  }
  const lines = w < 560 ? name : [name[0], name.slice(1).join(' ')];
  const avail = w - padX * 2;
  const widest = Math.max(...lines.map(l => measure(l, 100)));
  const fontSize = Math.min((avail / widest) * 100, h * (lines.length > 2 ? 0.105 : 0.14));
  const lineHeight = fontSize * 0.9;
  const blockH = lineHeight * lines.length;
  const portraitH = h * 0.62;
  const nameTop = Math.max(portraitH - blockH * 0.55, h * 0.3);
  return {
    w, h, mode: 'tall', padX, lines, fontSize, lineHeight,
    nameTop, nameBottom: nameTop + blockH, nameWidth: (widest * fontSize) / 100,
    portrait: { x: 0, y: 0, w, h: portraitH },
  };
}

function withAlpha(color: string, alpha: number): string {
  return color.replace(/^hsl\((.*)\)$/, `hsl($1 / ${alpha})`);
}

function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, r: Rect, focal: { x: number; y: number }, target: { x: number; y: number }, zoom: number) {
  const iw = img.width;
  const ih = img.height;
  const scale = Math.max(r.w / iw, r.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  let dx = r.x + r.w * target.x - focal.x * dw;
  let dy = r.y + r.h * target.y - focal.y * dh;
  dx = Math.min(r.x, Math.max(r.x + r.w - dw, dx));
  dy = Math.min(r.y, Math.max(r.y + r.h - dh, dy));
  ctx.drawImage(img, dx, dy, dw, dh);
}

export function composeHero(ctx: CanvasRenderingContext2D, layout: HeroLayout, dpr: number, palette: Palette, portrait: HTMLImageElement | null) {
  const { w, h } = layout;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, w, h);
  const r = layout.portrait;
  if (portrait && portrait.naturalWidth > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    ctx.filter = 'saturate(0.88) contrast(1.06)';
    const wide = layout.mode === 'wide';
    drawCover(ctx, portrait, r, { x: 0.455, y: 0.33 }, { x: wide ? 0.5 : 0.5, y: wide ? 0.4 : 0.42 }, wide ? 1.18 : 1.08);
    ctx.filter = 'none';
    ctx.fillStyle = withAlpha(palette.bg, 0.12);
    ctx.fillRect(r.x, r.y, r.w, r.h);
    if (wide) {
      ctx.fillStyle = palette.bg;
      ctx.fillRect(r.x - 2, r.y, 6, r.h);
      const gl = ctx.createLinearGradient(r.x + 3, 0, r.x + r.w * 0.42, 0);
      gl.addColorStop(0, withAlpha(palette.bg, 1));
      gl.addColorStop(0.55, withAlpha(palette.bg, 0.45));
      gl.addColorStop(1, withAlpha(palette.bg, 0));
      ctx.fillStyle = gl;
      ctx.fillRect(r.x + 3, r.y, r.w * 0.42, r.h);
      const gb = ctx.createLinearGradient(0, h * 0.62, 0, h);
      gb.addColorStop(0, withAlpha(palette.bg, 0));
      gb.addColorStop(1, withAlpha(palette.bg, 0.92));
      ctx.fillStyle = gb;
      ctx.fillRect(r.x, h * 0.62, r.w, h * 0.38 + 1);
    } else {
      const gb = ctx.createLinearGradient(0, r.h * 0.38, 0, r.h);
      gb.addColorStop(0, withAlpha(palette.bg, 0));
      gb.addColorStop(0.7, withAlpha(palette.bg, 0.8));
      gb.addColorStop(1, withAlpha(palette.bg, 1));
      ctx.fillStyle = gb;
      ctx.fillRect(0, r.h * 0.38, w, r.h * 0.62 + 1);
    }
    const gt = ctx.createLinearGradient(0, 0, 0, 120);
    gt.addColorStop(0, withAlpha(palette.bg, 0.55));
    gt.addColorStop(1, withAlpha(palette.bg, 0));
    ctx.fillStyle = gt;
    ctx.fillRect(r.x, 0, r.w, 120);
    ctx.restore();
    drawTicks(ctx, r, palette, layout.mode === 'wide');
  }
  ctx.fillStyle = palette.fg;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `400 ${layout.fontSize}px ${SERIF}`;
  const tracking = TRACKING * layout.fontSize;
  let lastEnd = 0;
  layout.lines.forEach((line, i) => {
    const baseline = layout.nameTop + layout.lineHeight * (i + 1) - layout.fontSize * 0.14;
    lastEnd = drawTracked(ctx, line, layout.padX, baseline, tracking);
  });
  const lastBaseline = layout.nameTop + layout.lineHeight * layout.lines.length - layout.fontSize * 0.14;
  ctx.fillStyle = palette.signal;
  ctx.fillText('.', lastEnd + tracking * 0.5, lastBaseline);
}

function drawTracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number): number {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
  return cx - tracking;
}

function drawTicks(ctx: CanvasRenderingContext2D, r: Rect, palette: Palette, wide: boolean) {
  ctx.save();
  ctx.strokeStyle = withAlpha(palette.fg, 0.55);
  ctx.lineWidth = 1;
  const s = 10;
  const inset = wide ? 28 : 16;
  const corners: [number, number][] = wide
    ? [[r.x + r.w * 0.36, 92], [r.x + r.w - inset, 92], [r.x + r.w * 0.36, r.h - inset - 40], [r.x + r.w - inset, r.h - inset - 40]]
    : [[inset, 76], [r.w - inset, 76]];
  for (const [x, y] of corners) {
    ctx.beginPath();
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y + s);
    ctx.stroke();
  }
  ctx.restore();
}

export function composeBanner(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, palette: Palette, text: string) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, w, h);
  const pad = containerPad(w);
  const size = Math.min(((w - pad * 2) / measure(`${text}.`, 100)) * 100, h * 0.78);
  ctx.font = `400 ${size}px ${SERIF}`;
  ctx.fillStyle = palette.fg;
  ctx.textBaseline = 'alphabetic';
  const width = measure(`${text}.`, size);
  const x = (w - width) / 2;
  const y = h * 0.5 + size * 0.3;
  const end = drawTracked(ctx, text, x, y, TRACKING * size);
  ctx.fillStyle = palette.signal;
  ctx.fillText('.', end + TRACKING * size * 0.5, y);
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function fontsReady(timeoutMs = 2500): Promise<void> {
  if (!('fonts' in document)) return;
  const load = Promise.all([
    document.fonts.load(`400 100px ${SERIF}`),
    document.fonts.load(`400 12px ${MONO}`),
  ]).then(() => undefined).catch(() => undefined);
  await Promise.race([load, new Promise<void>(r => setTimeout(r, timeoutMs))]);
}
