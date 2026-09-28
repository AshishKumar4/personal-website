import { clamp01, smoothstep } from './math';

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
  rush: number;
}

export const INTRO_GO = 0.5;

export function introDuration(small: boolean): number {
  return small ? 3.4 : 4.4;
}

const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);
const smootherD = (x: number) => 30 * x * x * (1 - x) * (1 - x);
const GLIDE = 2.1;

function path(q: number, small: boolean) {
  const L = small ? 620 : 760;
  const B = small ? 1000 : 1350;
  const lift = L * (1 - smoother(q));
  const back = B * Math.pow(1 - q, GLIDE);
  const vy = -L * smootherD(q);
  const vz = B * GLIDE * Math.pow(1 - q, GLIDE - 1);
  return { lift, back, vy, vz, speed: Math.hypot(vy, vz) / (L + B) };
}

export function introShot(p: number, small: boolean): IntroShot {
  const q = clamp01(p);
  const { lift, back, vy, vz, speed } = path(q, small);
  const heading = Math.atan2(vy, vz + 90);
  const settle = smoothstep(0.62, 1, q);
  return {
    lift: q >= 1 ? 0 : lift,
    back: q >= 1 ? 0 : back,
    pitch: -0.2 + heading * 0.6,
    pitchMix: q >= 1 ? 1 : settle,
    yaw: 0.16 * (1 - smoother(q)),
    roll: q >= 1 ? 0 : 0.035 * (1 - smoother(clamp01(q / 0.92))),
    fov: q >= 1 ? 0 : 3.2 * Math.min(1, speed / 1.1) * (1 - settle),
    exposure: q >= 1 ? 1 : smoothstep(0, 0.16, q),
    cloud: q >= 1 ? 0 : 1 - smoothstep(0.7, 0.96, q),
    reveal: smoothstep(0.42, 0.86, q),
    rush: q >= 1 ? 0 : Math.min(1, speed / 1.1) * (1 - settle),
  };
}
