import { emitFlight, onFlight } from './bus';
import { FlightInput } from './input';
import { Particles } from './particles';
import { Post } from './post';
import { SceneTracker, mixParams, sceneAt, type V3 } from './scenes';
import { TerrainRenderer } from './terrain-renderer';
import { raycast, terrainHeight, type TerrainShape } from './terrain-js';
import { damp, hsv, invert, lerp, lookAt, multiply, pathX, perspective, project, smoothstep, unproject } from './math';
import type { Frame } from './frame';

const FAR = 1400;
const CRUISE = 6.5;
const SUN_AZ = -0.42;

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
const shapeOf = (p: TerrainShape): TerrainShape => ({ amp: p.amp, terrace: p.terrace, terraceStep: p.terraceStep });

export function startFlight(canvas: HTMLCanvasElement, veil: HTMLElement | null, reduced: boolean): FlightHandle | null {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const small = window.innerWidth < 768 || Math.min(window.innerWidth, window.innerHeight) < 560;
  const locked = new URLSearchParams(window.location.search).get('flightq') === 'hi';
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
  const ripples: Ripple[] = [];
  const ripArr = new Float32Array(16);
  const front: V3 = [FAR, 120, 0];
  const lantern: [number, number, number, number] = [0, 0, 0, 0];
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
  let smoothY: number | null = null;
  let smx = 0;
  let smy = 0;
  let eye: V3 = [0, 205, 0];
  let focusMix = 0;
  let focusTarget = 0;
  let focusColor: V3 = [1, 1, 1];
  let lanternHit = false;
  let viewProj: Float32Array = new Float32Array(16);
  let inv: Float32Array = new Float32Array(16);
  let shapeA: TerrainShape = { amp: 1, terrace: 0, terraceStep: 16 };
  let shapeB: TerrainShape = shapeA;
  const deviceDpr = window.devicePixelRatio || 1;
  let dpr = Math.max(0.75, Math.min(deviceDpr, 1.5));
  let maxDpr = Math.max(dpr, Math.min(deviceDpr, small ? 1.5 : 1.75));
  let frameAvg = 16.7;
  let lastQuality = start;
  let lastUpgrade = 0;
  let lastTelemetry = 0;
  let lastVeil = -1;
  let lastKey = '';
  let rect = canvas.getBoundingClientRect();

  const heightAt = (x: number, z: number) => {
    const m = smoothstep(front[0] - front[1], front[0] + front[1], Math.hypot(x - eye[0], z - eye[2]));
    if (m <= 0) return terrainHeight(x, z, shapeA);
    if (m >= 1) return terrainHeight(x, z, shapeB);
    return terrainHeight(x, z, {
      amp: lerp(shapeA.amp, shapeB.amp, m),
      terrace: lerp(shapeA.terrace, shapeB.terrace, m),
      terraceStep: lerp(shapeA.terraceStep, shapeB.terraceStep, m),
    });
  };

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
    if (lost || reduced) return;
    const d = rayAt(cx, cy);
    const hit = raycast(eye, d, heightAt, FAR * 0.9);
    const hl = Math.hypot(d[0], d[2]) || 1;
    const x = hit ? hit[0] : eye[0] + (d[0] / hl) * 700;
    const z = hit ? hit[2] : eye[2] + (d[2] / hl) * 700;
    ripples.push({ x, z, t0: time, s: Math.max(0.2, Math.min(2, s)) });
    while (ripples.length > 4) ripples.shift();
    kick();
  };

  const input = new FlightInput(addRipple, !reduced);

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
    const animate = !reduced;
    if (animate) time += dt;
    tracker.maybeRefresh(now);
    const vh = window.innerHeight;
    const sy = window.scrollY;
    smoothY = animate && smoothY !== null ? damp(smoothY, sy, 4, dt) : sy;
    const s = tracker.sample(smoothY, vh, document.documentElement.scrollHeight);
    const A = sceneAt(s.a, s.pa);
    const B = sceneAt(s.b, s.pb);
    const t = s.t;
    const p = mixParams(A, B, smoothstep(0.05, 0.8, t));
    const tc = smoothstep(0.1, 0.95, t);
    const dip = s.a === s.b ? 0 : Math.sin(Math.PI * t);
    front[0] = lerp(FAR * 0.98, -170, Math.pow(t, 0.8));
    front[2] = Math.pow(dip, 0.7);
    shapeA = shapeOf(A);
    shapeB = shapeOf(B);

    if (animate) cruise += dt * CRUISE * lerp(A.speed, B.speed, tc) * (1 + dip * 0.8);
    scrollDist = animate ? damp(scrollDist, sy * 0.32, 3.2, dt) : sy * 0.32;
    smx = animate ? damp(smx, input.hover ? input.mx : 0, 2.5, dt) : 0;
    smy = animate ? damp(smy, input.hover ? input.my : 0, 2.5, dt) : 0;

    const z = -(cruise + scrollDist);
    const alt = 205 + lerp(A.altitude, B.altitude, tc) - dip * 26 + Math.sin(time * 0.31) * 1.2;
    const x = pathX(z);
    const ahead = 420;
    const tx = pathX(z - ahead) + smx * 26;
    const ty = alt - 118 - smy * 30 + lerp(A.lookUp, B.lookUp, tc) + dip * 10;
    const slope = (pathX(z - 12) - pathX(z + 12)) / 24;
    const roll = (-slope * 0.55 - smx * 0.05) * (1 + lerp(A.roll, B.roll, tc));
    eye = [x, alt, z];
    const fx = tx - x;
    const fl = Math.hypot(fx, ahead) || 1;
    const view = lookAt(eye, [tx, ty, z - ahead], roll);
    const aspect = canvas.width / Math.max(1, canvas.height);
    const fov = (((aspect < 1 ? 68 : 52) + lerp(A.fov, B.fov, tc) + dip * 6) * Math.PI) / 180;
    viewProj = multiply(perspective(fov, aspect, 0.5, FAR * 1.1), view);
    inv = invert(viewProj);

    const hit = input.hover && animate ? raycast(eye, rayAt(input.px, input.py), heightAt, FAR * 0.85) : null;
    if (hit) {
      const k = lanternHit ? 1 - Math.exp(-dt * 14) : 1;
      lantern[0] = lerp(lantern[0], hit[0], k);
      lantern[1] = lerp(lantern[1], hit[2], k);
      lantern[2] = lerp(lantern[2], hit[1], k);
    }
    lanternHit = !!hit;
    focusMix = animate ? damp(focusMix, focusTarget, 4, dt) : focusTarget;
    lantern[3] = damp(lantern[3], hit ? p.lanternAmt * (1 + focusMix * 0.35) : 0, hit ? 5 : 3, dt);

    for (let i = ripples.length - 1; i >= 0; i--) if (time - ripples[i].t0 > 2.8) ripples.splice(i, 1);
    ripArr.fill(0);
    ripples.forEach((r, i) => ripArr.set([r.x, r.z, time - r.t0, r.s], i * 4));

    const tinted = (c: V3): V3 => {
      const lum = Math.max(0.35, (c[0] + c[1] + c[2]) / 3) * 1.2;
      return mix3(c, [focusColor[0] * lum, focusColor[1] * lum, focusColor[2] * lum], focusMix * 0.5);
    };
    const sunEl = -0.06 + 0.15 * p.sun;
    const sv = [Math.sin(SUN_AZ) * Math.cos(sunEl), Math.sin(sunEl), -Math.cos(SUN_AZ) * Math.cos(sunEl)];
    const sp = [eye[0] + sv[0] * 1000, eye[1] + sv[1] * 1000, eye[2] + sv[2] * 1000];
    const sw = viewProj[3] * sp[0] + viewProj[7] * sp[1] + viewProj[11] * sp[2] + viewProj[15];
    const sxy = project(viewProj, sp);
    const intro = reduced ? 1 : smoothstep(0, 1, (now - start) / 3200);
    const f: Frame = {
      viewProj,
      inv,
      cam: eye,
      fwd: [fx / fl, -ahead / fl],
      time,
      intro: 0.08 + intro * 0.92,
      far: FAR,
      p,
      a: A,
      b: B,
      front,
      lineA: tinted(A.line),
      lineB: tinted(B.line),
      lantern,
      lanternColor: mix3(p.lantern, focusColor, focusMix * 0.85),
      ripples: ripArr,
      seed: (1 - Math.max(A.jitter, B.jitter)) * 22 + time * 0.9,
      pxPerRad: canvas.height / fov,
      pxScale: canvas.height / (2 * Math.tan(fov / 2)),
      sunDir: [SUN_AZ, sunEl],
      dprScale: dpr,
    };
    post.begin();
    terrain.render(f);
    particles.render(f, [lantern[0], lantern[1], lantern[2], Math.min(1, lantern[3])]);
    post.finish({
      time,
      bloom: p.bloom,
      warp: dip * 0.3,
      glitch: p.glitch,
      scan: p.scanlines,
      grain: 0.05,
      exposure: p.exposure,
      dpr,
      rays: [sxy[0] * 0.5 + 0.5, sxy[1] * 0.5 + 0.5, sw > 0 ? p.rays * p.sun : 0],
      rayColor: p.glow,
    });

    if (veil) {
      const v = (s.legacy ? 0.3 * (1 - t * 0.85) : p.veil) * smoothstep(vh * 0.1, vh * 0.8, sy);
      if (Math.abs(v - lastVeil) > 0.002) {
        veil.style.opacity = v.toFixed(3);
        lastVeil = v;
      }
    }

    if (now - lastTelemetry > 125) {
      lastTelemetry = now;
      emitFlight('telemetry', { scene: s.dominant, sceneMix: t, distance: -z });
    }
    if (animate) quality(now, dt);
    const key = `${s.a}${s.b}${t.toFixed(3)}${focusMix.toFixed(2)}`;
    const settling = !animate && key !== lastKey;
    lastKey = key;
    if ((animate || settling) && visible && onscreen) raf = requestAnimationFrame(frame);
  };

  function kick() {
    if (!raf && !disposed && !lost && visible && onscreen) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  const onVis = () => {
    visible = !document.hidden;
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
  const onResize = () => {
    tracker.refresh();
    resize();
    kick();
  };
  const ro = new ResizeObserver(() => {
    resize();
    kick();
  });
  ro.observe(canvas);
  const bodyRo = new ResizeObserver(onResize);
  bodyRo.observe(document.body);
  const io = new IntersectionObserver(entries => {
    onscreen = entries.some(en => en.isIntersecting);
    kick();
  });
  io.observe(canvas);
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('scroll', kick, { passive: true });
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
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', kick);
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
