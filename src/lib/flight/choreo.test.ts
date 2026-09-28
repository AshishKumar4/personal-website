import { describe, expect, test } from 'bun:test';
import { introShot } from './choreo';

describe('intro', () => {
  for (const small of [false, true]) {
    test(`lands exactly on the hero framing (${small ? 'small' : 'large'})`, () => {
      const s = introShot(1, small);
      expect(s.lift).toBe(0);
      expect(s.back).toBe(0);
      expect(s.pitchMix).toBe(1);
      expect(s.yaw).toBe(0);
      expect(s.roll).toBe(0);
      expect(s.fov).toBe(0);
      expect(s.exposure).toBe(1);
      expect(s.cloud).toBe(0);
      expect(s.reveal).toBe(1);
    });
  }

  test('starts high, dark and above the cloud layer', () => {
    const s = introShot(0, false);
    expect(s.lift).toBeGreaterThan(600);
    expect(s.exposure).toBe(0);
    expect(s.cloud).toBe(1);
    expect(s.reveal).toBe(0);
  });

  test('descends monotonically', () => {
    let prev = Infinity;
    for (let p = 0; p <= 1.0001; p += 0.02) {
      const l = introShot(p, false).lift;
      expect(l).toBeLessThanOrEqual(prev);
      prev = l;
    }
  });
});
