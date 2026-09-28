import { describe, expect, test } from 'bun:test';
import { crestAt, introShot, NO_CREST } from './choreo';

describe('crest', () => {
  test('rests at both ends of the band', () => {
    expect(crestAt(0)).toEqual(NO_CREST);
    expect(crestAt(1)).toEqual(NO_CREST);
  });

  test('is back at normal framing before the new title can reach the screen', () => {
    for (let t = 0.6; t <= 1.2; t += 0.05) expect(crestAt(t)).toEqual(NO_CREST);
  });

  test('climbs before it pitches down', () => {
    const early = crestAt(0.2);
    const late = crestAt(0.46);
    expect(early.up).toBeGreaterThan(early.down);
    expect(late.down).toBeGreaterThan(late.up);
    expect(crestAt(0.38).climb).toBeGreaterThan(0.9);
  });
});

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
