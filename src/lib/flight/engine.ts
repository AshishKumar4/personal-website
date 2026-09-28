import { emitFlight, onFlight } from './bus';
import { INTRO_GO, introDuration, introShot } from './choreo';
import { FlightInput } from './input';
import { DRONE_TRAIL, Particles } from './particles';
import { alpineOf, applyMotif, motifCode, variation, type MotifId, type Variation } from './motifs';
import { Post, type PostUniforms } from './post';
import { SceneTracker, mixParams, sceneAt, type V3 } from './scenes';
import { TerrainRenderer } from './terrain-renderer';
import { TerrainField, raycast } from './terrain-js';
import { clamp01, damp, hsv, invert, lerp, lookAt, multiply, pathX, perspective, project, smoothstep, unproject } from './math';
import type { Frame } from './frame';
import type { Program } from './gl';
import { QualityController } from './quality';

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

export function startFlight(canvas: HTMLCanvasElement, veil: HTMLElement | null, reduced: boolean, onFail?: () => void): FlightHandle | null {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  gl.getExtension('KHR_parallel_shader_compile');
  const small = window.innerWidth < 768 || Math.min(window.innerWidth, window.innerHeight) < 560;
  const query = new URLSearchParams(window.location.search);
  const locked = query.get('flightq') === 'hi';
  const freezeAt = query.has('freeze') && Number.isFinite(Number(query.get('freeze'))) ? Number(query.get('freeze')) : null;
  const frozen = freezeAt !== null;
  let terrain: TerrainRenderer;
  let particles: Particles;
  let post: Post;
  try {
    terrain = new TerrainRenderer(gl, small ? 0.6 : 1, FAR);
    particles = new Particles(gl, small ? 980 : 2600);
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
  let pending: Program[] = [...terrain.programs, ...particles.programs, ...post.programs];
  let warm = true;
  let visible = !document.hidden;
  let onscreen = true;
  let start = performance.now();
  let last = start;
  let time = frozen ? freezeAt : reduced ? 14 : 0;
  let cruise = frozen ? freezeAt * CRUISE : 0;
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
  const field = new TerrainField(sceneAt('night', 0));
  let varA: Variation = variation(null);
  let varB: Variation = varA;
  const beacon: [number, number, number, number] = [0, 0, 0, 0];
  let summit: V3 | null = null;
  let pendingSummit: V3 | null = null;
  let lastSummit = 0;
  let prevZ: number | null = null;
  let vz = frozen ? CRUISE : 0;
  const drone = new Float32Array((DRONE_TRAIL + 1) * 3);
  const deviceDpr = window.devicePixelRatio || 1;
  let dpr = Math.max(0.75, Math.min(deviceDpr, 1.5));
  const maxDpr = Math.max(dpr, Math.min(deviceDpr, small ? 1.5 : 1.75));
  const qc = new QualityController(dpr, maxDpr, post.bloomOn, start);
  let lastScroll = -Infinity;
  let lastTelemetry = 0;
  let lastVeil = -1;
  let lastKey = '';
  let rect = canvas.getBoundingClientRect();
  const root = document.documentElement;
  const introAt = frozen && query.has('intro') && Number.isFinite(Number(query.get('intro'))) ? Number(query.get('intro')) : null;
  const introLen = introDuration(small);
  let introState: 'wait' | 'on' | 'off' = !reduced && !frozen && root.dataset.intro === 'hold' ? 'wait' : 'off';
  let introPlayed = false;
  let introT0 = 0;
  let introY = 0;
  let abortAt = -1;
  let moveAcc = 0;
  let moveT = 0;
  let moveX = -1;
  let moveY = -1;

  const heightAt = (x: number, z: number) => field.height(x, z, smoothstep(front[0] - front[1], front[0] + front[1], Math.hypot(x - eye[0], z - eye[2])));

  const inView = (p: V3) => {
    const q = project(viewProj, p);
    const d = Math.hypot(p[0] - eye[0], p[2] - eye[2]);
    return q[0] > -0.3 && q[0] < 0.9 && q[1] < 0.72 && q[1] > -0.4 && d > 300 && d < 1200;
  };

  const clearTo = (p: V3) => {
    if (!inView(p)) return false;
    for (let k = 1; k < 24; k++) {
      const t = k / 24;
      if (heightAt(eye[0] + (p[0] - eye[0]) * t, eye[2] + (p[2] - eye[2]) * t) > eye[1] + (p[1] + 4 - eye[1]) * t) return false;
    }
    return true;
  };

  const climb = (p: V3): V3 => {
    let [x, h, z] = p;
    let step = 30;
    for (let k = 0; k < 12; k++) {
      const gx = heightAt(x + 2, z) - heightAt(x - 2, z);
      const gz = heightAt(x, z + 2) - heightAt(x, z - 2);
      const gl = Math.hypot(gx, gz);
      if (gl < 1e-4) break;
      const nx = x + (gx / gl) * step;
      const nz = z + (gz / gl) * step;
      const nh = heightAt(nx, nz);
      if (nh > h) {
        x = nx;
        z = nz;
        h = nh;
      } else step *= 0.5;
    }
    return [x, h, z];
  };

  const findSummit = (fwd: [number, number]): V3 | null => {
    const rx = -fwd[1];
    const rz = fwd[0];
    const cands: V3[] = [];
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 9; j++) {
        const dist = 340 + i * 68;
        const lat = (j / 8 - 0.4) * dist * 0.9;
        const x = eye[0] + fwd[0] * dist + rx * lat;
        const z = eye[2] + fwd[1] * dist + rz * lat;
        const p: V3 = [x, heightAt(x, z), z];
        if (inView(p)) cands.push(p);
      }
    }
    cands.sort((u, v) => v[1] - u[1]);
    for (const c of cands.slice(0, 8)) {
      const top = climb(c);
      if (clearTo(top)) return top;
      if (clearTo(c)) return c;
    }
    return null;
  };

  const droneAt = (tt: number, cz: number, out: Float32Array, o: number) => {
    const z = cz - (250 + 40 * Math.sin(tt * 0.21));
    const x = pathX(z) + 30 * Math.sin(tt * 0.61) + 12 * Math.sin(tt * 1.43 + 0.6);
    out[o] = x;
    out[o + 1] = heightAt(x, z) + 30 + 8 * Math.sin(tt * 0.9);
    out[o + 2] = z;
  };

  const resize = () => {
    rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    const changed = canvas.width !== w || canvas.height !== h;
    if (changed) {
      canvas.width = w;
      canvas.height = h;
    }
    if (!lost) post.resize(w, h);
    return changed;
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
        focusColor = hsv(((e.hue % 1) + 1) % 1, 0.78, 1);
        focusTarget = e.strength ?? 1;
      }
      kick();
    }),
  ];

  const releaseText = () => {
    if (root.dataset.intro === 'hold' || root.dataset.intro === 'dive') root.dataset.intro = 'go';
  };
  const abortIntro = () => {
    if (introState !== 'on' || abortAt >= 0) return;
    abortAt = performance.now();
    releaseText();
    kick();
  };
  const onIntroKey = (e: KeyboardEvent) => {
    if (e.key !== 'Shift' && e.key !== 'Meta' && e.key !== 'Alt' && e.key !== 'Control') abortIntro();
  };
  const onIntroMove = (e: PointerEvent) => {
    if (moveX >= 0) {
      moveAcc = moveAcc * Math.exp(-Math.max(0, e.timeStamp - moveT) / 160) + Math.hypot(e.clientX - moveX, e.clientY - moveY);
      if (moveAcc > 360) abortIntro();
    }
    moveX = e.clientX;
    moveY = e.clientY;
    moveT = e.timeStamp;
  };
  const introEvents: [string, EventListener][] = [
    ['wheel', abortIntro],
    ['touchstart', abortIntro],
    ['pointerdown', abortIntro],
    ['keydown', onIntroKey as EventListener],
    ['pointermove', onIntroMove as EventListener],
  ];
  const endIntro = () => {
    if (introState === 'on') introEvents.forEach(([type, fn]) => window.removeEventListener(type, fn));
    introState = 'off';
    releaseText();
  };
  const beginIntro = (now: number) => {
    if (introState !== 'wait') return;
    if (root.dataset.intro !== 'hold' || window.scrollY > 40) {
      introState = 'off';
      return;
    }
    introState = 'on';
    introPlayed = true;
    introT0 = now;
    introY = window.scrollY;
    root.dataset.intro = 'dive';
    introEvents.forEach(([type, fn]) => window.addEventListener(type, fn, { passive: true }));
  };

  const applyQuality = (now: number) => {
    if (!qc.apply(now, now - lastScroll > 450)) return;
    dpr = qc.dpr;
    post.bloomOn = qc.bloom;
    resize();
  };

  let regionsDirty = false;
  let lastRegions = 0;

  const frame = (now: number) => {
    raf = 0;
    if (disposed || lost) return;
    if (pending.length) {
      if (!pending.every(pr => pr.ready())) {
        last = now;
        raf = requestAnimationFrame(frame);
        return;
      }
      try {
        pending.forEach(pr => pr.finalize());
      } catch (err) {
        console.warn('flight: init failed', err);
        teardown();
        onFail?.();
        return;
      }
      pending = [];
      start = now;
      last = now;
      qc.restart(now);
      beginIntro(now);
    }
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const animate = !reduced && !frozen;
    if (animate) {
      time += dt;
      applyQuality(now);
    }
    if (regionsDirty && now - lastRegions > 200) {
      regionsDirty = false;
      lastRegions = now;
      tracker.refresh();
    }
    const vh = window.innerHeight;
    const sy = window.scrollY;
    smoothY = animate && smoothY !== null ? damp(smoothY, sy, 4, dt) : sy;
    const s = tracker.sample(smoothY, vh);
    const A = applyMotif(sceneAt(s.a, s.pa), s.ma, s.pa);
    const B = applyMotif(sceneAt(s.b, s.pb), s.mb, s.pb);
    const t = s.t;
    const p = mixParams(A, B, smoothstep(0.05, 0.8, t));
    const tc = smoothstep(0.1, 0.95, t);
    const dip = s.a === s.b ? 0 : Math.sin(Math.PI * t);
    front[0] = lerp(FAR * 0.98, -170, Math.pow(t, 0.8));
    front[2] = Math.pow(dip, 0.7);
    varA = variation(s.sa);
    varB = s.sb === s.sa ? varA : variation(s.sb);
    field.a = A;
    field.b = B;
    field.va = varA;
    field.vb = varB;
    field.alp = [A.alpine * alpineOf(s.sa), B.alpine * alpineOf(s.sb)];
    field.time = time;

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
    if (animate && prevZ !== null && dt > 0) vz = damp(vz, (prevZ - z) / dt, 3, dt);
    prevZ = z;
    const fx = tx - x;
    const fl = Math.hypot(fx, ahead) || 1;
    let iw = 0;
    let ip = 1;
    if (introState === 'on') {
      ip = clamp01((now - introT0) / 1000 / introLen);
      if (Math.abs(window.scrollY - introY) > 4) abortIntro();
      const fade = abortAt < 0 ? 1 : 1 - smoothstep(0, 400, now - abortAt);
      if (ip >= INTRO_GO) releaseText();
      if (ip >= 1 || fade <= 0) endIntro();
      else iw = fade;
    } else if (introAt !== null) {
      ip = clamp01(introAt / introLen);
      iw = ip < 1 ? 1 : 0;
    }
    const shot = iw > 0 ? introShot(ip, small) : null;
    let view: Float32Array;
    const aspect = canvas.width / Math.max(1, canvas.height);
    let fovDeg = (aspect < 1 ? 68 : 52) + lerp(A.fov, B.fov, tc) + dip * 6;
    if (shot) {
      const dx = tx - x;
      const dy = ty - alt;
      const yawN = Math.atan2(dx, ahead);
      const pitchN = Math.atan2(dy, Math.hypot(dx, ahead));
      const yaw = yawN + shot.yaw * iw;
      const pitch = pitchN + (lerp(shot.pitch, pitchN, shot.pitchMix) - pitchN) * iw;
      const ie: V3 = [x, alt + shot.lift * iw, z + shot.back * iw];
      const cp = Math.cos(pitch);
      view = lookAt(ie, [ie[0] + Math.sin(yaw) * cp * ahead, ie[1] + Math.sin(pitch) * ahead, ie[2] - Math.cos(yaw) * cp * ahead], roll + shot.roll * iw);
      eye = ie;
      fovDeg += shot.fov * iw;
    } else view = lookAt(eye, [tx, ty, z - ahead], roll);
    const fov = (fovDeg * Math.PI) / 180;
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
    lantern[3] = damp(lantern[3], hit ? p.lanternAmt * (1 + focusMix * 0.15) : 0, hit ? 5 : 3, dt);

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
    const intro = shot ? 1 - (1 - shot.reveal) * iw : reduced || frozen || introPlayed ? 1 : smoothstep(0, 1, (now - start) / 3200);
    const mt = smoothstep(0.05, 0.8, t);
    const weight = (id: MotifId) => (s.ma === id ? 1 - mt : 0) + (s.mb === id ? mt : 0);
    const ctf = weight('ctf');
    if (ctf > 0.001) {
      if (now - lastSummit > 350 || !animate) {
        lastSummit = now;
        const cand = findSummit([fx / fl, -ahead / fl]);
        const keep = summit && inView(summit) && (!cand || cand[1] < summit[1] + 24);
        if (!keep && cand) pendingSummit = cand;
        else if (!keep) pendingSummit = null;
      }
      if (pendingSummit && (beacon[3] < 0.02 || !summit || !animate)) {
        summit = pendingSummit;
        pendingSummit = null;
      }
      if (summit) {
        summit[1] = heightAt(summit[0], summit[2]);
        beacon[0] = summit[0];
        beacon[1] = summit[1];
        beacon[2] = summit[2];
      }
      const target = summit && !pendingSummit ? ctf : 0;
      beacon[3] = animate ? damp(beacon[3], target, pendingSummit ? 6 : 2.4, dt) : target;
    } else {
      beacon[3] = 0;
      summit = null;
      pendingSummit = null;
    }
    if (s.ma === 'drone' || s.mb === 'drone') {
      for (let k = 0; k <= DRONE_TRAIL; k++) droneAt(time - k * 0.045, z + k * 0.045 * vz, drone, k * 3);
    }
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
      pxPerRad: canvas.height / fov,
      pxScale: canvas.height / (2 * Math.tan(fov / 2)),
      sunDir: [SUN_AZ, sunEl],
      dprScale: dpr,
      motif: [motifCode(s.ma), motifCode(s.mb)],
      varA,
      varB,
      alpine: field.alp,
      mq: small ? 0.6 : 1,
      emu: weight('emulator'),
      drone,
      beacon,
      reduced,
    };
    const cursor: [number, number, number, number] = [lantern[0], lantern[1], lantern[2], Math.min(1, lantern[3])];
    const pu: PostUniforms = {
      time,
      bloom: p.bloom,
      warp: dip * 0.3,
      scan: p.scanlines,
      grain: 0.05,
      exposure: shot ? p.exposure * (1 - (1 - shot.exposure) * iw) : p.exposure,
      dpr,
      rays: [sxy[0] * 0.5 + 0.5, sxy[1] * 0.5 + 0.5, sw > 0 ? p.rays * p.sun : 0],
      rayColor: p.glow,
      cloud: shot
        ? { amt: shot.cloud * iw, base: small ? 400 : 480, top: small ? 520 : 620, slabs: small ? 3 : 5, time, moon: p.moon, inv, eye, color: [p.skyHorizon[0] * 3 + 0.16, p.skyHorizon[1] * 3 + 0.18, p.skyHorizon[2] * 3 + 0.25] }
        : undefined,
    };
    post.begin();
    if (warm) {
      warm = false;
      terrain.warm(f);
      particles.render(f, cursor, true);
    }
    terrain.render(f);
    particles.render(f, cursor);
    post.finish(pu);

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
    if (animate && !locked) qc.sample(now, dt * 1000);
    const key = `${s.a}${s.b}${s.ma}${s.mb}${s.sa}${s.sb}${t.toFixed(3)}${focusMix.toFixed(2)}${ip.toFixed(3)}`;
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
      pending = [...terrain.programs, ...particles.programs, ...post.programs];
      warm = true;
      lost = false;
      resize();
      kick();
    } catch (err) {
      console.warn('flight: restore failed', err);
    }
  };
  const redraw = () => {
    if (disposed || lost || !visible) return;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    frame(performance.now());
  };
  const onResize = () => {
    tracker.refresh();
    if (resize()) redraw();
    else kick();
  };
  const onScroll = () => {
    lastScroll = performance.now();
    kick();
  };
  const ro = new ResizeObserver(() => {
    if (resize()) redraw();
    else kick();
  });
  ro.observe(canvas);
  const bodyRo = new ResizeObserver(onResize);
  bodyRo.observe(document.body);
  const mo = new MutationObserver(records => {
    for (const r of records) {
      if (r.type === 'attributes' || [...r.addedNodes, ...r.removedNodes].some(n => n.nodeType === 1)) {
        regionsDirty = true;
        kick();
        return;
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-scene', 'data-motif', 'data-seed'] });
  const io = new IntersectionObserver(entries => {
    onscreen = entries.some(en => en.isIntersecting);
    kick();
  });
  io.observe(canvas);
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);
  tracker.refresh();
  resize();
  kick();
  if (frozen) {
    (window as unknown as { __flightBench?: (n: number, at?: number) => number[] }).__flightBench = (n: number, at?: number) => {
      const out: number[] = [];
      if (at !== undefined) {
        time = at;
        cruise = at * CRUISE;
      }
      const px = new Uint8Array(4);
      pending.forEach(pr => pr.finalize());
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      for (let i = 0; i < n; i++) {
        const t0 = performance.now();
        frame(t0);
        gl.finish();
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        out.push(performance.now() - t0);
      }
      return out;
    };
  }

  function teardown() {
    if (disposed) return;
    disposed = true;
    endIntro();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    ro.disconnect();
    bodyRo.disconnect();
    mo.disconnect();
    io.disconnect();
    offs.forEach(fn => fn());
    input.dispose();
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
  }

  return { dispose: teardown };
}
