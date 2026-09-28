import { describe, it, expect } from 'bun:test';
import { QualityController } from './quality';

function run(qc: QualityController, from: number, seconds: number, frame: (dpr: number, t: number) => number, scrolling = () => false) {
  let t = from;
  const changes: number[] = [];
  while (t < from + seconds * 1000) {
    const ms = frame(qc.dpr, t);
    t += ms;
    const before = qc.dpr;
    if (qc.apply(t, !scrolling())) {
      if (qc.dpr !== before) changes.push(qc.dpr);
    }
    qc.sample(t, ms);
  }
  return { t, changes };
}

describe('QualityController', () => {
  it('keeps a fast machine at full quality and upgrades to the ceiling', () => {
    const qc = new QualityController(1.5, 1.75, true, 0);
    const { changes } = run(qc, 0, 60, () => 16.7);
    expect(qc.dpr).toBe(1.75);
    expect(qc.bloom).toBe(true);
    expect(changes).toEqual([1.625, 1.75]);
  });

  it('never downgrades a 60fps machine with occasional long frames', () => {
    const qc = new QualityController(1.5, 1.75, true, 0);
    let i = 0;
    run(qc, 0, 120, () => (++i % 45 === 0 ? 50 : 16.7));
    expect(qc.dpr).toBe(1.75);
    expect(qc.bloom).toBe(true);
  });

  it('downgrades a machine that sustains 30 to 45fps', () => {
    const qc = new QualityController(1.5, 1.5, true, 0);
    let i = 0;
    run(qc, 0, 20, () => (++i % 2 ? 33.3 : 16.7));
    expect(qc.dpr).toBeLessThan(1.5);
  });

  it('settles instead of oscillating when the top level is just too slow', () => {
    const qc = new QualityController(1.25, 1.75, true, 0);
    const { changes } = run(qc, 0, 600, dpr => (dpr > 1.25 ? 33.3 : 16.7));
    expect(qc.dpr).toBe(1.25);
    expect(changes.length).toBeLessThan(6);
    const late = run(qc, 600000, 600, dpr => (dpr > 1.25 ? 33.3 : 16.7));
    expect(late.changes.length).toBe(0);
  });

  it('turns bloom off only once resolution is at the floor', () => {
    const qc = new QualityController(1, 1, true, 0);
    run(qc, 0, 60, () => 40);
    expect(qc.dpr).toBe(0.75);
    expect(qc.bloom).toBe(false);
  });

  it('defers reallocation while the user is scrolling', () => {
    const qc = new QualityController(1.5, 1.5, true, 0);
    let scrolling = true;
    run(qc, 0, 20, () => 40, () => scrolling);
    expect(qc.dpr).toBe(1.5);
    expect(qc.pending).toBe(true);
    scrolling = false;
    expect(qc.apply(20001, true)).toBe(true);
    expect(qc.dpr).toBe(1.25);
  });
});
