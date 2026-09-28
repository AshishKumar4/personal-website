import { useEffect, type RefObject } from 'react';
import { scrollToHash } from '@/lib/site-events';

export type RegionKind = 'hero' | 'reveal' | 'node' | 'section';

export interface RegionMeta {
  kind: RegionKind;
  id?: string;
  label?: string;
  year?: number | null;
  scene?: string;
  anchor?: 'top' | 'bottom';
  span?: number;
}

interface Region extends RegionMeta {
  el: HTMLElement;
  top: number;
  height: number;
  p: number;
  words: number;
  still: boolean;
}

export interface StageState {
  y: number;
  vh: number;
  heroP: number;
  node: number;
  nodes: number;
  label: string;
  scene: string;
  year: number | null;
  nodeYear: number | null;
  inTimeline: boolean;
  progress: number;
}

type StageListener = (state: StageState) => void;

const regions: Region[] = [];
const listeners = new Set<StageListener>();
let raf = 0;
let vh = 0;
let bound = false;
let ro: ResizeObserver | null = null;
let last: StageState | null = null;

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function measure() {
  vh = window.innerHeight;
  const y = window.scrollY;
  for (const r of regions) {
    r.top = r.el.getBoundingClientRect().top + y;
    r.height = r.el.offsetHeight;
    r.words = r.kind === 'reveal' ? r.el.querySelectorAll('.w').length : 0;
  }
  regions.sort((a, b) => a.top - b.top);
}

function update() {
  raf = 0;
  const y = window.scrollY;
  const center = y + vh * 0.5;
  let heroP = 1;
  const nodes: Region[] = [];
  let firstSection: Region | null = null;
  for (const r of regions) {
    if (r.kind === 'node') nodes.push(r);
    if (r.kind === 'section' && !firstSection) firstSection = r;
    if (r.kind !== 'hero' && r.kind !== 'reveal') continue;
    let p: number;
    if (r.kind === 'hero') {
      p = (y - r.top) / Math.max(1, r.height);
      heroP = Math.max(0, Math.min(1, p));
    } else {
      const edge = (r.anchor === 'top' ? r.top : r.top + r.height) - y;
      p = (vh - edge) / (vh * (r.span ?? 0.35));
    }
    p = Math.max(-1, Math.min(2, p));
    if (Math.abs(p - r.p) > 0.0004) {
      const v = p.toFixed(4);
      r.p = p;
      r.el.style.setProperty('--p', v);
      const pv = Number(v);
      const still = r.words > 0 && (pv <= 0 || pv * 1.3 - (r.words - 1) * 0.09 >= 1.001);
      if (still !== r.still) {
        r.still = still;
        if (still) r.el.dataset.still = '';
        else delete r.el.dataset.still;
      }
    }
  }
  let node = -1;
  for (let i = 0; i < nodes.length; i++) if (nodes[i].top <= center) node = i;
  const cur = nodes[node];
  const nodeP = cur ? Math.max(0, Math.min(1, (center - cur.top) / Math.max(1, cur.height))) : 0;
  let year: number | null = null;
  let nodeYear: number | null = null;
  if (cur) {
    let from: number | null = null;
    for (let i = node; i >= 0 && from === null; i--) from = nodes[i].year ?? null;
    let to: number | null = null;
    for (let i = node + 1; i < nodes.length && to === null; i++) to = nodes[i].year ?? null;
    year = from === null ? to : cur.year != null && to !== null ? from + (to - from) * nodeP : from;
    nodeYear = cur.year ?? from;
  } else if (nodes.length) {
    year = nodes.find(n => n.year != null)?.year ?? null;
  }
  const endTop = firstSection ? firstSection.top : Infinity;
  const startTop = nodes[0]?.top ?? Infinity;
  const inTimeline = center >= startTop - vh * 0.2 && center < endTop;
  const span = Math.max(1, endTop === Infinity ? 1 : endTop - startTop);
  const state: StageState = {
    y,
    vh,
    heroP,
    node,
    nodes: nodes.length,
    label: cur?.label ?? '',
    scene: cur?.scene ?? 'night',
    year,
    nodeYear,
    inTimeline,
    progress: Math.max(0, Math.min(1, (center - startTop) / span)),
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
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  last = null;
}

export function useStageRegion(ref: RefObject<HTMLElement>, meta: RegionMeta) {
  const { kind, id, label, year, scene, anchor, span } = meta;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const region: Region = { el, kind, id, label, year, scene, anchor, span, top: 0, height: 0, p: -9, words: 0, still: false };
    regions.push(region);
    bind();
    remeasure();
    return () => {
      delete el.dataset.still;
      const i = regions.indexOf(region);
      if (i >= 0) regions.splice(i, 1);
      unbind();
    };
  }, [ref, kind, id, label, year, scene, anchor, span]);
}

export function onStage(fn: StageListener): () => void {
  listeners.add(fn);
  if (last) fn(last);
  else schedule();
  return () => {
    listeners.delete(fn);
  };
}

function go(top: number) {
  window.scrollTo({ top: Math.max(0, top), behavior: reducedMotion() ? 'auto' : 'smooth' });
}

export function scrollToSection(id: string) {
  if (id === 'timeline') id = regions.find(r => r.kind === 'node')?.id ?? id;
  const title = regions.find(r => r.kind === 'reveal' && r.id === id);
  if (title) {
    go(title.top + title.height - vh * 0.62);
    return;
  }
  scrollToHash(id);
}

export function scrollToYear(year: number) {
  const nodes = regions.filter(r => r.kind === 'node');
  const target = nodes.find(n => n.year != null && Math.floor(n.year) >= year) ?? nodes[nodes.length - 1];
  if (!target) return;
  const title = regions.find(r => r.kind === 'reveal' && r.id === target.id);
  go(title ? title.top + title.height - vh * 0.62 : target.top);
}
