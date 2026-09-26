import type { SceneParams, V3 } from './scenes';

export interface Frame {
  viewProj: Float32Array;
  inv: Float32Array;
  cam: V3;
  fwd: [number, number];
  time: number;
  intro: number;
  far: number;
  p: SceneParams;
  a: SceneParams;
  b: SceneParams;
  front: V3;
  lineA: V3;
  lineB: V3;
  lantern: [number, number, number, number];
  lanternColor: V3;
  ripples: Float32Array;
  seed: number;
  pxPerRad: number;
  pxScale: number;
  sunDir: [number, number];
  dprScale: number;
}
