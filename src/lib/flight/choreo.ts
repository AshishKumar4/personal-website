import { clamp01, smoothstep } from './math';

const bump = (x: number) => 4 * x * (1 - x);

export interface IntroShot {
  lift: number;
  back: number;
  pitch: number;
  pitchMix: number;
  yaw: number;
  roll: number;
  fov: number;
  exposure: number;
  cloud: number;
  reveal: number;
}

export const INTRO_GO = 0.4;

export function introDuration(small: boolean): number {
  return small ? 2.9 : 3.8;
}

export function introShot(p: number, small: boolean): IntroShot {
  const q = clamp01(p);
  const fall = smoothstep(0.08, 1, q);
  const descent = 1 - Math.pow(1 - fall, 2.4);
  const travel = 1 - Math.pow(1 - smoothstep(0, 1, q), 2);
  const nose = smoothstep(0.1, 0.38, q);
  return {
    lift: (small ? 560 : 820) * (1 - descent),
    back: (small ? 420 : 640) * (1 - travel),
    pitch: -0.3 - 0.75 * nose,
    pitchMix: smoothstep(0.4, 1, q),
    yaw: 0.22 * (1 - smoothstep(0.05, 0.95, q)),
    roll: 0.1 * (1 - smoothstep(0.1, 0.9, q)) - 0.05 * bump(smoothstep(0.35, 1, q)),
    fov: 3 * bump(smoothstep(0.25, 0.8, q)),
    exposure: 0.6 * smoothstep(0, 0.12, q) + 0.4 * smoothstep(0.4, 0.75, q),
    cloud: 1 - smoothstep(0.5, 0.66, q),
    reveal: smoothstep(0.36, 0.82, q),
  };
}
