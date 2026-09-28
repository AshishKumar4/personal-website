import { describe, expect, test } from 'bun:test';
import { M, MOTIF_IDS, MOTIF_SCENE, alpineOf, applyMotif } from './motifs';
import { sceneAt } from './scenes';
import { SHAPE_KEYS, TerrainField, arenaH, crystalH, quantumH, terrainBase } from './terrain-js';

describe('motif registry', () => {
  test('existing codes are stable and new worlds are appended', () => {
    const old = ['boot', 'ctf', 'lab', 'packets', 'denoise', 'waveform', 'agents', 'build', 'drone', 'emulator', 'workspaces', 'clouds', 'dew', 'fog'];
    old.forEach((id, i) => expect(M[id as keyof typeof M]).toBe(i + 1));
    expect(MOTIF_IDS.slice(old.length)).toEqual(['crystal', 'quantum', 'arena', 'mind', 'canyon']);
    for (const id of MOTIF_IDS) expect(MOTIF_SCENE[id]).toBeDefined();
  });

  test('alpine variation is bounded and off without a seed', () => {
    expect(alpineOf(null)).toBe(0);
    for (let s = 0; s < 1; s += 0.01) {
      const a = alpineOf(s);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
    }
  });

  test('alpine of zero leaves the base mountains untouched', () => {
    for (let i = 0; i < 40; i++) {
      const x = i * 37.3 - 700;
      const z = -i * 91.7;
      expect(terrainBase(x, z, [120, -300, 0.2, 0.1], 1, 0)).toBe(terrainBase(x, z, [120, -300, 0.2, 0.1], 1));
    }
  });
});

describe('new terrain worlds', () => {
  const worlds = ['crystal', 'quantum', 'arena', 'mind', 'canyon'] as const;

  test('each world yields finite heights and keeps the flight path clear', () => {
    for (const id of worlds) {
      const p = applyMotif(sceneAt(MOTIF_SCENE[id], 0.3), id, 0.3);
      const f = new TerrainField(p);
      f.time = 4;
      let max = 0;
      for (let i = 0; i < 400; i++) {
        const z = -i * 23.1;
        const x = ((i * 7919) % 1600) - 800;
        const h = f.height(x, z, 0);
        expect(Number.isFinite(h)).toBe(true);
        max = Math.max(max, h);
      }
      expect(max).toBeGreaterThan(20);
      const eye = 205 + p.altitude;
      for (let i = 0; i < 200; i++) {
        const z = -i * 41;
        const x = 38 * Math.sin(z * 0.0045) + 16 * Math.sin(z * 0.011 + 1.3);
        expect(f.height(x, z, 0)).toBeLessThan(eye - 20);
      }
    }
  });

  test('shape keys cover the new archetypes', () => {
    for (const id of worlds) expect(SHAPE_KEYS).toContain(id);
  });

  test('arena heights sit on whole levels outside ramps and props', () => {
    let flat = 0;
    for (let i = 0; i < 300; i++) {
      const h = arenaH(300 + i * 5.3, -i * 11.7, 48, -24);
      if (h % 16 === 0) flat++;
    }
    expect(flat).toBeGreaterThan(150);
    expect(crystalH(400, -300, 0, 0)).toBeGreaterThanOrEqual(0);
    expect(quantumH(0, -500, 300, 200, 3)).toBeGreaterThanOrEqual(2);
  });
});
