import { describe, expect, test } from 'bun:test';
import { alphaBar, noiseScale, quantize, signalScale, snr } from './schedule';
import { bentoRows } from '../bento';

describe('cosine noise schedule', () => {
  test('is clean at t=0 and pure noise at t=1', () => {
    expect(alphaBar(0)).toBeCloseTo(1, 6);
    expect(alphaBar(1)).toBeLessThan(1e-4);
  });

  test('is strictly decreasing in t', () => {
    let prev = alphaBar(0);
    for (let i = 1; i <= 100; i++) {
      const next = alphaBar(i / 100);
      expect(next).toBeLessThan(prev);
      prev = next;
    }
  });

  test('keeps signal and noise on the unit circle', () => {
    for (const t of [0, 0.1, 0.37, 0.5, 0.9, 1]) {
      expect(signalScale(t) ** 2 + noiseScale(t) ** 2).toBeCloseTo(1, 6);
    }
  });

  test('snr crosses 1 near the middle of the schedule', () => {
    expect(snr(0.45)).toBeGreaterThan(1);
    expect(snr(0.55)).toBeLessThan(1);
  });

  test('quantizes to discrete sampler steps', () => {
    expect(quantize(1, 60)).toEqual({ t: 1, step: 0 });
    expect(quantize(0, 60)).toEqual({ t: 0, step: 60 });
    expect(quantize(0.5, 60).step).toBe(30);
  });
});

describe('bento layout', () => {
  test('every row fills the 12-column grid', () => {
    for (let n = 1; n <= 20; n++) {
      const rows = bentoRows(n);
      expect(rows.flat().length).toBe(n);
      for (const row of rows) expect(row.reduce((a, b) => a + b, 0)).toBe(12);
    }
  });

  test('never leaves a single orphan after a triple', () => {
    expect(bentoRows(8)).toEqual([[7, 5], [5, 7], [6, 6], [6, 6]]);
  });
});
