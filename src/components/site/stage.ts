import { useEffect, type RefObject } from 'react';

export type RegionKind = 'hero' | 'chapter' | 'section' | 'end';

interface Region {
  el: HTMLElement;
  kind: RegionKind;
  label: string;
  pinnable: boolean;
  pinned: boolean;
  top: number;
  height: number;
  p: number;
  live: boolean;
  liveEl: HTMLElement | null;
  liveTop: number;
  onLive?: () => void;
}

export interface StageState {
  y: number;
  vh: number;
  kind: RegionKind | null;
  label: string;
  chapter: number;
  chapterP: number;
  chapters: number;
  heroP: number;
  endP: number;
}

type StageListener = (state: StageState) => void;

const regions: Region[] = [];
const listeners = new Set<StageListener>();
let raf = 0;
let vh = 0;
let bound = false;
let ro: ResizeObserver | null = null;
let io: IntersectionObserver | null = null;
let last: StageState | null = null;

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function canPin() {
  return !reducedMotion() && window.matchMedia('(min-width: 768px) and (min-height: 620px)').matches;
}

function absTop(el: HTMLElement) {
  return el.getBoundingClientRect().top + window.scrollY;
}

function measure() {
  vh = window.innerHeight;
  const pin = canPin();
  for (const r of regions) {
    r.pinned = r.pinnable && pin;
    const mode = r.pinned ? 'pin' : 'flow';
    if (r.el.dataset.mode !== mode) r.el.dataset.mode = mode;
  }
  for (const r of regions) {
    r.top = absTop(r.el);
    r.height = r.el.offsetHeight;
    r.liveTop = r.liveEl ? absTop(r.liveEl) : r.top;
  }
  regions.sort((a, b) => a.top - b.top);
  observeReveals();
}

function observeReveals() {
  if (!io) {
    io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io?.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );
  }
  for (const r of regions) {
    if (r.pinned) continue;
    r.el.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)').forEach(n => io?.observe(n));
  }
}

function update() {
  raf = 0;
  const y = window.scrollY;
  const center = y + vh * 0.5;
  let active: Region | null = null;
  const chapters = regions.filter(r => r.kind === 'chapter');
  for (const r of regions) {
    let p: number;
    if (r.kind === 'hero') p = (y - r.top) / Math.max(1, r.height);
    else if (r.pinned) p = (y - r.top) / Math.max(1, r.height - vh);
    else p = -0.3 + ((vh * 0.85 - (r.top - y)) / (vh * 0.6)) * 0.8;
    p = Math.max(-1.2, Math.min(2, p));
    if (Math.abs(p - r.p) > 0.0004) {
      r.p = p;
      r.el.style.setProperty('--p', p.toFixed(4));
    }
    if (!r.live) {
      const hit = r.pinned ? p > 0.06 : r.liveTop - y < vh * 0.88;
      if (hit) {
        r.live = true;
        r.el.dataset.live = '1';
        r.onLive?.();
      }
    }
    if (center >= r.top && center < r.top + r.height) active = r;
  }
  const hero = regions.find(r => r.kind === 'hero');
  const end = regions.find(r => r.kind === 'end');
  const ci = active ? chapters.indexOf(active) : -1;
  let chapter = ci;
  if (ci < 0) {
    chapter = -1;
    for (let i = 0; i < chapters.length; i++) if (chapters[i].top <= center) chapter = i;
  }
  const state: StageState = {
    y,
    vh,
    kind: active?.kind ?? null,
    label: active?.label ?? '',
    chapter,
    chapterP: ci >= 0 ? Math.max(0, Math.min(1, (center - active!.top) / active!.height)) : chapter >= 0 ? 1 : 0,
    chapters: chapters.length,
    heroP: hero ? Math.max(0, Math.min(1, (y - hero.top) / Math.max(1, hero.height))) : 1,
    endP: end ? Math.max(0, Math.min(1, (y + vh - end.top) / vh)) : 0,
  };
  last = state;
  listeners.forEach(fn => fn(state));
}

function schedule() {
  if (!raf) raf = requestAnimationFrame(update);
}

function remeasure() {
  measure();
  schedule();
}

function bind() {
  if (bound) return;
  bound = true;
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', remeasure);
  ro = new ResizeObserver(remeasure);
  ro.observe(document.body);
}

function unbind() {
  if (!bound || regions.length > 0) return;
  bound = false;
  window.removeEventListener('scroll', schedule);
  window.removeEventListener('resize', remeasure);
  ro?.disconnect();
  ro = null;
  io?.disconnect();
  io = null;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}

interface RegionOptions {
  kind: RegionKind;
  label: string;
  pin?: boolean;
  onLive?: () => void;
}

export function useStageRegion(ref: RefObject<HTMLElement>, { kind, label, pin = false, onLive }: RegionOptions) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const region: Region = {
      el,
      kind,
      label,
      pinnable: pin,
      pinned: false,
      top: 0,
      height: 0,
      p: -9,
      live: false,
      liveEl: el.querySelector<HTMLElement>('[data-anchor]'),
      liveTop: 0,
      onLive,
    };
    regions.push(region);
    bind();
    remeasure();
    return () => {
      const i = regions.indexOf(region);
      if (i >= 0) regions.splice(i, 1);
      delete el.dataset.mode;
      unbind();
    };
  }, [ref, kind, label, pin, onLive]);
}

export function onStage(fn: StageListener): () => void {
  listeners.add(fn);
  if (last) fn(last);
  else schedule();
  return () => {
    listeners.delete(fn);
  };
}

export function scrollToChapter(index: number) {
  const r = regions.filter(x => x.kind === 'chapter')[index];
  if (!r) return;
  const top = r.pinned ? r.top + (r.height - vh) * 0.3 : r.top - vh * 0.08;
  window.scrollTo({ top, behavior: reducedMotion() ? 'auto' : 'smooth' });
}
