import { emitFlight, onFlight } from './bus';
import { FlightAudio } from './audio';
import { FlightInput } from './input';
import { Particles } from './particles';
import { Post } from './post';
import { SceneTracker, mixParams, sceneAt, type SceneParams, type V3 } from './scenes';
import { TerrainRenderer } from './terrain-renderer';
import { raycast, terrainHeight } from './terrain-js';
import { clamp01, damp, hsv, invert, lerp, lookAt, multiply, pathX, perspective, smoothstep, unproject, wrapAngle } from './math';
import type { Frame } from './frame';

const FAR = 1400;
const CRUISE = 6.5;
const FREE_SPEED = 34;

export interface FlightHandle {
  dispose(): void;
}

interface Ripple {
  x: number;
  z: number;
  t0: number;
  s: number;
}

const mix3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function startFlight(canvas: HTMLCanvasElement, veil: HTMLElement | null, reduced: boolean): FlightHandle | null {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const small = window.innerWidth < 768 || Math.min(window.innerWidth, window.innerHeight) < 560;
  const query = new URLSearchParams(window.location.search);
  const locked = query.get('flightq') === 'hi';
  let terrain: TerrainRenderer;
  let particles: Particles;
  let post: Post;
  try {
    terrain = new TerrainRenderer(gl, small ? 0.6 : 1, FAR);
    particles = new Particles(gl, small ? 1200 : 3200);
    post = new Post(gl, !small || locked);
  } catch (err) {
    console.warn('flight: init failed', err);
    return null;
  }

  const tracker = new SceneTracker();
  const audio = new FlightAudio();
  const ripples: Ripple[] = [];
  const ripArr = new Float32Array(16);
  let raf = 0;
  let disposed = false;
  let lost = false;
  let visible = !document.hidden;
  let onscreen = true;
  const start = performance.now();
  let last = start;
  let time = reduced ? 14 : 0;
  let cruise = 0;
  let scrollDist = window.scrollY * 0.32;
  let smx = 0;
  let smy = 0;
  let boost = 0;
  let busBoost = false;
  let free = false;
  let freeMix = 0;
  const fc = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, pitchKey: 0 };
  let camYaw = 0;
  let camPitch = 0;
  let camRoll = 0;
  let eye: V3 = [0, 205, 0];
  let prevEye: V3 | null = null;
  let speed = 0;
  let focusMix = 0;
  let focusTarget = 0;
  let focusColor: V3 = [1, 1, 1];
  const lantern: [number, number, number, number] = [0, 0, 0, 0];
  let lanternHit = false;
  let params: SceneParams | null = null;
  let viewProj: Float32Array = new Float32Array(16);
  let inv: Float32Array = new Float32Array(16);
  let dpr = Math.max(0.75, Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  let maxDpr = dpr;
  let frameAvg = 16.7;
  let lastQuality = start;
  let lastUpgrade = 0;
  let lastTelemetry = 0;
  let lastVeil = -1;
  let rect = canvas.getBoundingClientRect();
  let lastSceneKey = '';

  const resize = () => {
    rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    if (!lost) post.resize(w, h);
  };

  const shape = () => ({ amp: params?.amp ?? 1, terrace: params?.terrace ?? 0, terraceStep: params?.terraceStep ?? 16 });

  const rayAt = (cx: number, cy: number) => {
    const nx = ((cx - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ny = 1 - ((cy - rect.top) / Math.max(1, rect.height)) * 2;
    const a = unproject(inv, nx, ny, -1);
    const b = unproject(inv, nx, ny, 1);
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l = Math.hypot(d[0], d[1], d[2]) || 1;
    return [d[0] / l, d[1] / l, d[2] / l];
  };

  const addRipple = (cx: number, cy: number, s: number) => {
    if (lost || (reduced && !free)) return;
    const d = rayAt(cx, cy);
    const hit = raycast(eye, d, shape(), FAR * 0.9);
    let x: number;
    let z: number;
    if (hit) {
      x = hit[0];
      z = hit[2];
    } else {
      const hl = Math.hypot(d[0], d[2]) || 1;
      x = eye[0] + (d[0] / hl) * 700;
      z = eye[2] + (d[2] / hl) * 700;
    }
    ripples.push({ x, z, t0: time, s: Math.max(0.2, Math.min(2, s)) });
    while (ripples.length > 4) ripples.shift();
    audio.chime(Math.min(1, s));
    kick();
  };

  const input = new FlightInput({ ripple: addRipple }, !reduced);

  const setFree = (on: boolean) => {
    if (on === free) return;
    free = on;
    input.free = on;
    tracker.frozen = on;
    if (on) {
      fc.x = eye[0];
      fc.y = eye[1];
      fc.z = eye[2];
      fc.yaw = camYaw;
      fc.pitch = camPitch;
      fc.roll = camRoll;
      fc.pitchKey = camPitch + 0.12;
    } else {
      cruise = -fc.z - scrollDist;
      input.keys.clear();
      tracker.refresh();
    }
    kick();
  };

  const offs = [
    onFlight('pulse', e => addRipple(e.x, e.y, e.strength ?? 1)),
    onFlight('focus', e => {
      if (e.hue === null || e.hue === undefined) focusTarget = 0;
      else {
        focusColor = hsv(((e.hue % 1) + 1) % 1, 0.62, 1);
        focusTarget = e.strength ?? 1;
      }
      kick();
    }),
    onFlight('boost', on => {
      busBoost = on;
      kick();
    }),
    onFlight('free', setFree),
    onFlight('sound', on => (on ? audio.enable() : audio.disable())),
  ];

  const quality = (now: number, dt: number) => {
    if (locked) return;
    frameAvg += (dt * 1000 - frameAvg) * 0.05;
    if (now - lastQuality < 2000) return;
    if (frameAvg > 25) {
      if (now - lastUpgrade < 8000) maxDpr = Math.max(0.75, dpr - 0.125);
      if (dpr > 0.75) dpr = Math.max(0.75, dpr - 0.25);
      else if (post.bloomOn) post.bloomOn = false;
      else return;
      lastQuality = now;
      frameAvg = 16.7;
      resize();
    } else if (frameAvg < 17.8 && dpr < maxDpr && now - lastQuality > 6000) {
      dpr = Math.min(maxDpr, dpr + 0.125);
      lastQuality = now;
      lastUpgrade = now;
      resize();
    }
  };

  const frame = (now: number) => {
    raf = 0;
    if (disposed || lost) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const animate = !reduced || free || freeMix > 0.001;
    if (animate) time += dt;
    if (!tracker.frozen) tracker.maybeRefresh(now);
    const vh = window.innerHeight;
    const sy = window.scrollY;
    const s = tracker.sample(sy, vh, document.documentElement.scrollHeight);
    const target = mixParams(sceneAt(s.a, s.pa), sceneAt(s.b, s.pb), s.t);
    params = !params || !animate ? target : mixParams(params, target, 1 - Math.exp(-dt * 5));
    const p = params;

    const wantBoost = (input.boosting || busBoost) && animate ? 1 : 0;
    boost = damp(boost, wantBoost, wantBoost > boost ? 2.4 : 1.6, dt);
    if (boost < 0.001) boost = 0;
    const cruiseSpeed = CRUISE * p.speed * (1 + 4.6 * boost);
    if (animate && !free) cruise += dt * cruiseSpeed;
    const targetScroll = sy * 0.32;
    scrollDist = animate ? damp(scrollDist, targetScroll, 3.2, dt) : targetScroll;
    smx = damp(smx, input.hover ? input.mx : 0, 2.5, dt);
    smy = damp(smy, input.hover ? input.my : 0, 2.5, dt);
    if (!animate) {
      smx = 0;
      smy = 0;
    }

    const dist = cruise + scrollDist;
    const z = -dist;
    const alt = 205 + p.altitude + Math.sin(time * 0.31) * 1.2;
    const x = pathX(z);
    const ahead = 420;
    const dx = pathX(z - ahead) + smx * 26 - x;
    const dy = -118 - smy * 30 + p.lookUp;
    const dl = Math.hypot(dx, dy, ahead);
    const pathYaw = Math.atan2(dx / dl, ahead / dl);
    const pathPitch = Math.asin(dy / dl);
    const slope = (pathX(z - 12) - pathX(z + 12)) / 24;
    const pathRoll = -slope * 0.55 - smx * 0.05;

    if (free || freeMix > 0.001) {
      if (free) {
        const yawRate = input.axis('left', 'right') * 1.1 + smx * 0.9;
        fc.yaw += yawRate * dt;
        fc.pitchKey = Math.max(-0.45, Math.min(0.5, fc.pitchKey + input.axis('down', 'up') * dt * 0.7));
        fc.pitch = damp(fc.pitch, Math.max(-0.6, Math.min(0.45, fc.pitchKey - 0.12 - smy * 0.35)), 3, dt);
        fc.roll = damp(fc.roll, -yawRate * 0.32, 3, dt);
      }
      const v = FREE_SPEED * (1 + 4.6 * boost) * (free ? 1 : 1 - freeMix * 0.5);
      const cp = Math.cos(fc.pitch);
      fc.x += Math.sin(fc.yaw) * cp * v * dt;
      fc.z -= Math.cos(fc.yaw) * cp * v * dt;
      fc.y += Math.sin(fc.pitch) * v * dt;
      const ground = terrainHeight(fc.x, fc.z, shape());
      if (fc.y < ground + 28) {
        fc.y = damp(fc.y, ground + 28, 10, dt);
        if (fc.pitch < 0) fc.pitchKey = damp(fc.pitchKey, 0.1, 2, dt);
      }
      fc.y = Math.min(fc.y, 900);
    }
    freeMix = clamp01(freeMix + (free ? dt : -dt) / 1.6);
    const fm = smoothstep(0, 1, freeMix);
    fc.yaw = pathYaw + wrapAngle(fc.yaw - pathYaw);
    eye = [lerp(x, fc.x, fm), lerp(alt, fc.y, fm), lerp(z, fc.z, fm)];
    camYaw = lerp(pathYaw, fc.yaw, fm);
    camPitch = lerp(pathPitch, fc.pitch, fm);
    camRoll = lerp(pathRoll, fc.roll, fm);
    const cp = Math.cos(camPitch);
    const fwd: V3 = [Math.sin(camYaw) * cp, Math.sin(camPitch), -Math.cos(camYaw) * cp];
    const view = lookAt(eye, [eye[0] + fwd[0] * 420, eye[1] + fwd[1] * 420, eye[2] + fwd[2] * 420], camRoll);
    const aspect = canvas.width / Math.max(1, canvas.height);
    const fovDeg = (aspect < 1 ? 68 : 52) + 12 * boost;
    const fov = (fovDeg * Math.PI) / 180;
    const proj = perspective(fov, aspect, 0.5, FAR * 1.1);
    viewProj = multiply(proj, view);
    inv = invert(viewProj);

    if (prevEye && dt > 0) speed = damp(speed, Math.hypot(eye[0] - prevEye[0], eye[1] - prevEye[1], eye[2] - prevEye[2]) / dt, 4, dt);
    prevEye = eye;

    const lanternOn = input.hover && animate;
    let hit: [number, number, number] | null = null;
    if (lanternOn) hit = raycast(eye, rayAt(input.px, input.py), shape(), FAR * 0.85);
    if (hit) {
      const k = lanternHit ? 1 - Math.exp(-dt * 14) : 1;
      lantern[0] = lerp(lantern[0], hit[0], k);
      lantern[1] = lerp(lantern[1], hit[2], k);
      lantern[2] = lerp(lantern[2], hit[1], k);
    }
    lanternHit = !!hit;
    focusMix = damp(focusMix, focusTarget, 4, dt);
    lantern[3] = damp(lantern[3], hit ? p.lanternAmt * (1 + focusMix * 0.35) : 0, hit ? 5 : 3, dt);

    for (let i = ripples.length - 1; i >= 0; i--) if (time - ripples[i].t0 > 2.8) ripples.splice(i, 1);
    ripArr.fill(0);
    ripples.forEach((r, i) => ripArr.set([r.x, r.z, time - r.t0, r.s], i * 4));

    const lum = Math.max(0.35, (p.line[0] + p.line[1] + p.line[2]) / 3);
    const tint: V3 = [focusColor[0] * lum * 1.2, focusColor[1] * lum * 1.2, focusColor[2] * lum * 1.2];
    const intro = reduced ? 1 : smoothstep(0, 1, (now - start) / 3200);
    const f: Frame = {
      viewProj,
      inv,
      cam: eye,
      fwd: [fwd[0], fwd[2]],
      rot: wrapAngle(camYaw - pathYaw * (1 - fm)),
      time,
      intro: 0.08 + intro * 0.92,
      far: FAR,
      p,
      line: mix3(p.line, tint, focusMix * 0.5),
      lantern,
      lanternColor: mix3(p.lantern, focusColor, focusMix * 0.85),
      ripples: ripArr,
      seed: (1 - p.jitter) * 22 + time * 0.9,
      pxPerRad: canvas.height / fov,
      pxScale: canvas.height / (2 * Math.tan(fov / 2)),
      sunDir: [-0.42, -0.06 + 0.15 * p.sun],
      boost,
      dprScale: dpr,
      width: canvas.width,
      height: canvas.height,
    };
    post.begin();
    terrain.render(f);
    particles.render(f, [lantern[0], lantern[1], lantern[2], clamp01(lantern[3])]);
    post.finish({ time, bloom: p.bloom, boost, glitch: p.glitch, scan: p.scanlines, grain: 0.05, exposure: p.exposure, dpr });

    if (veil) {
      const top = smoothstep(vh * 0.1, vh * 0.8, sy);
      const v = (s.legacy ? 0.3 * (1 - s.t * 0.85) : p.veil) * top * (1 - fm);
      if (Math.abs(v - lastVeil) > 0.002) {
        veil.style.opacity = v.toFixed(3);
        lastVeil = v;
      }
    }

    audio.update(speed, boost);
    if (now - lastTelemetry > 125) {
      lastTelemetry = now;
      const heading = ((camYaw * 180) / Math.PI + 360) % 360;
      emitFlight('telemetry', { scene: s.dominant, sceneMix: s.t, altitude: eye[1], speed, heading, distance: -eye[2], boost, free });
    }
    if (animate) quality(now, dt);
    const key = `${s.a}${s.b}${s.t.toFixed(3)}`;
    const settling = !animate && key !== lastSceneKey;
    lastSceneKey = key;
    if ((animate || settling || boost > 0) && visible && onscreen) raf = requestAnimationFrame(frame);
  };

  function kick() {
    if (!raf && !disposed && !lost && visible && onscreen) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  const onScroll = () => kick();
  const onVis = () => {
    visible = !document.hidden;
    last = performance.now();
    kick();
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const onRestored = () => {
    try {
      terrain.init();
      particles.init();
      post.init();
      lost = false;
      resize();
      kick();
    } catch (err) {
      console.warn('flight: restore failed', err);
    }
  };
  const ro = new ResizeObserver(() => {
    resize();
    kick();
  });
  ro.observe(canvas);
  const bodyRo = new ResizeObserver(() => {
    tracker.refresh();
    kick();
  });
  bodyRo.observe(document.body);
  const io = new IntersectionObserver(entries => {
    onscreen = entries.some(en => en.isIntersecting);
    kick();
  });
  io.observe(canvas);
  const onResize = () => {
    tracker.refresh();
    resize();
    kick();
  };
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);
  tracker.refresh();
  resize();
  kick();

  return {
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      bodyRo.disconnect();
      io.disconnect();
      offs.forEach(fn => fn());
      input.dispose();
      audio.dispose();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      if (!lost) {
        terrain.dispose();
        particles.dispose();
        post.dispose();
      }
    },
  };
}
