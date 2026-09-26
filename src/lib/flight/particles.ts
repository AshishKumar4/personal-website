import { Program } from './gl';
import { NOISE, TERRAIN } from './glsl';
import type { Frame } from './frame';
import { M } from './motifs';

const HEAD = `#version 300 es
precision highp float;
uniform mat4 u_viewProj;
uniform float u_time;
uniform float u_far;
uniform float u_fog;
uniform float u_pxScale;
uniform vec2 u_amount;
uniform float u_minPx;
${NOISE}
${TERRAIN}
float amountAt(vec2 p) {
  return mix(u_amount.x, u_amount.y, sweepAt(p));
}
float sprite(float a, float core, inout float energy) {
  float s = max(core * 2.2, u_minPx);
  energy *= min(1.0, pow(core * 2.2 / s, 1.5) + 0.12);
  if (a < 0.003) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return 0.0; }
  return min(s, 40.0);
}
float fogA(vec3 w) {
  float d = length(w.xz - u_cam.xz);
  return (1.0 - smoothstep(u_far * u_fog, u_far * 0.95, d)) * smoothstep(8.0, 40.0, d);
}
`;

const FIREFLY_VERT = `${HEAD}
uniform vec2 u_fwd;
uniform vec4 u_cursor;
uniform float u_box;
out float v_a;
out vec3 v_col;
uniform vec3 u_colorA;
uniform vec3 u_colorB;
vec3 drift(float id, vec2 center) {
  vec3 r = hash31(id * 1.618 + 0.5);
  vec2 p = mod(r.xy * u_box - center + u_box * 0.5, u_box) - u_box * 0.5 + center;
  float edge = max(abs(p.x - center.x), abs(p.y - center.y)) / (u_box * 0.5);
  float t = u_time * (0.04 + r.z * 0.05);
  p += vec2(snoise(p * 0.005 + vec2(t, 1.7)), snoise(p * 0.005 + vec2(4.3, t))) * 34.0;
  return vec3(p, edge);
}
void main() {
  float id = float(gl_VertexID);
  vec3 r = hash31(id * 1.618 + 0.5);
  vec3 r2 = hash31(id * 0.713 + 11.0);
  vec2 center = u_cam.xz + u_fwd * u_box * 0.42;
  vec3 dr = drift(id, center);
  vec2 p = dr.xy;
  float edge = dr.z;
  vec4 grp = vec4(0.0);
  float boost = 1.0;
  float steady = 0.0;
  vec3 tint = vec3(1.0);
  float tintW = 0.0;
  if (motifOn(${M.agents}.0) || motifOn(${M.build}.0) || motifOn(${M.workspaces}.0)) {
    float sw = sweepAt(p);
    float wa = motifW(${M.agents}.0, sw);
    float wb = motifW(${M.build}.0, sw);
    float wo = motifW(${M.workspaces}.0, sw);
    float gid = floor(id / 9.0);
    float k = mod(id, 9.0);
    vec3 hg = hash31(gid * 3.17 + 5.3);
    vec3 an = drift(gid * 9.0, center);
    float ja = wa * step(0.45, hg.x);
    float jb = wb * step(0.5, hg.y);
    float jo = wo * step(mix(0.75, 0.55, u_mq), hg.x) * step(0.3, r2.z);
    float join = min(1.0, ja + jb + jo);
    if (join > 0.001) {
      float ay = groundH(an.xy) + 12.0 + hg.z * 22.0;
      vec2 right = vec2(-u_fwd.y, u_fwd.x);
      vec2 loose = an.xy + (r.xy - 0.5) * 80.0 + vec2(sin(u_time * 0.3 + r2.x * 20.0), cos(u_time * 0.27 + r2.y * 20.0)) * 6.0;
      p = mix(p, loose, join);
      edge = mix(edge, an.z, join);
      float per = 11.0 + hg.y * 9.0;
      float ph = fract(u_time / per + hg.z * 5.0);
      float ga = smoothstep(0.02, 0.22, ph) * (1.0 - smoothstep(0.5, 0.74, ph)) * ja;
      float ang = u_time * (0.45 + r2.x * 0.6) * (r2.y > 0.5 ? 1.0 : -1.0) + k * 0.698;
      vec3 ta = vec3(an.xy + vec2(cos(ang), sin(ang)) * (2.5 + r2.z * 5.0), ay + sin(u_time * 1.7 + k) * 1.5);
      float perb = 9.0 + hg.z * 6.0;
      float sec = fract(u_time / perb + hg.x * 3.0) * perb;
      float s0 = 0.8 + k * 0.14;
      float gb = smoothstep(s0, s0 + 0.22, sec) * (1.0 - smoothstep(4.6, 5.4, sec)) * jb;
      vec3 tb = vec3(an.xy + right * (mod(k, 3.0) - 1.0) * 4.2, ay + (floor(k / 3.0) - 1.0) * 4.2);
      float flash = gb * exp(-max(sec - s0 - 0.22, 0.0) * 3.0);
      vec3 to = vec3(an.xy + right * (mod(k, 3.0) - 1.0) * 3.6, ay + floor(k / 3.0) * 3.2 - 3.0);
      float go = jo;
      float gs = ga + gb + go;
      if (gs > 0.001) grp = vec4((ta * ga + tb * gb + to * go) / gs, min(1.0, gs));
      boost = 1.0 + ga * 0.45 + flash * 1.8 + go * 0.25;
      steady = max(max(ga * 0.6, gb), go);
      tintW = clamp(gb * 0.55 + go * 0.8, 0.0, 1.0);
      tint = (vec3(0.82, 0.95, 1.0) * gb + vec3(1.0, 0.76, 0.46) * go) / max(gb + go, 1e-4);
    }
  }
  p = mix(p, grp.xy, grp.w);
  vec2 toC = u_cursor.xy - p;
  float dc = length(toC);
  float pull = u_cursor.w * smoothstep(210.0, 30.0, dc) * (1.0 - grp.w * 0.7);
  float ang = atan(-toC.y, -toC.x) + u_time * (0.25 + r2.x * 0.5) * (r2.y > 0.5 ? 1.0 : -1.0);
  vec2 orbit = u_cursor.xy + vec2(cos(ang), sin(ang)) * (10.0 + r2.z * 55.0);
  p = mix(p, orbit, pull * 0.82);
  vec2 rp = ripple(p);
  float y = groundH(p) + 6.0 + r.z * r.z * 48.0 + sin(u_time * (0.6 + r.x) + id) * 3.0;
  y = mix(y, grp.z, grp.w * (1.0 - pull));
  y = mix(y, max(y, u_cursor.z + 8.0 + r2.z * 34.0), pull * 0.7);
  vec3 w = vec3(p.x, y, p.y);
  gl_Position = u_viewProj * vec4(w, 1.0);
  float blink = 0.25 + 0.75 * pow(0.5 + 0.5 * sin(u_time * (0.8 + r2.x * 2.2) + r2.y * 40.0), 3.0);
  blink = mix(blink, 0.82 + 0.1 * sin(u_time * 0.4 + id), steady);
  float a = fogA(w) * (1.0 - smoothstep(0.82, 1.0, edge)) * amountAt(p);
  v_a = a * blink * boost * (1.0 + pull * 0.8 + rp.y * 2.0);
  v_col = mix(mix(u_colorA, u_colorB, sweepAt(p)), vec3(1.0, 0.72, 0.36), step(0.86, r2.x));
  v_col = mix(v_col, tint, tintW);
  gl_PointSize = sprite(a, u_pxScale * (0.7 + r.x * 0.8) / gl_Position.w, v_a);
}`;

const HUB = [520, 390];
const HUB_N = 5;
const SRV_CELL = 44;
const SRV_N = 22;
const SRV_LEDS = 6;
const CTF_CELL = 170;
const CTF_N = 12;
export const DRONE_TRAIL = 28;

const motifVert = (kind: number) => `${HEAD}
#define KIND ${kind}
uniform vec2 u_fwd;
uniform vec3 u_drone[${DRONE_TRAIL + 1}];
out float v_a;
out vec3 v_col;
void hide() {
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  gl_PointSize = 0.0;
  v_a = 0.0;
  v_col = vec3(0.0);
}
void emit(vec3 w, float a, float size, vec3 col) {
  gl_Position = u_viewProj * vec4(w, 1.0);
  float f = a * fogA(w);
  v_a = f;
  v_col = col;
  gl_PointSize = sprite(f, u_pxScale * size / gl_Position.w, v_a);
}
vec2 gridCell(float ci, float n, float cell) {
  vec2 center = u_cam.xz + u_fwd * cell * n * 0.38;
  return vec2(mod(ci, n), floor(ci / n)) - floor(n * 0.5) + floor(center / cell);
}
void main() {
  float id = float(gl_VertexID);
#if KIND == ${M.servers}
  {
    float ci = floor(id / ${SRV_LEDS}.0);
    float li = mod(id, ${SRV_LEDS}.0);
    vec2 g = gridCell(ci, ${SRV_N}.0, ${SRV_CELL}.0);
    float hs = hash12(g * 1.31 + 0.7);
    if (hs < mix(0.76, 0.52, u_mq)) { hide(); return; }
    vec2 c = (g + 0.2 + hash22(g + 4.1) * 0.6) * ${SRV_CELL}.0;
    float h = groundAt(c);
    float around = (groundAt(c + vec2(46.0, 0.0)) + groundAt(c - vec2(46.0, 0.0))) * 0.5;
    float ex = max(1.0 - smoothstep(40.0, 80.0, h), smoothstep(4.0, 16.0, around - h));
    if (ex < 0.01) { hide(); return; }
    vec2 right = vec2(-u_fwd.y, u_fwd.x);
    vec2 p = c + right * (mod(li, 3.0) - 1.0) * 1.7;
    vec3 w = vec3(p.x, groundH(c) + 2.2 + floor(li / 3.0) * 1.7, p.y);
    float hl = hash12(g * 3.1 + li * 7.7);
    float amber = step(0.78, hl);
    float rate = 1.5 + fract(hl * 37.0) * 7.0;
    float act = step(0.38, hash12(vec2(floor(u_time * rate + hl * 9.0), hl * 91.0)));
    float slow = step(0.45, fract(u_time * 0.45 + hl * 5.0));
    float on = mix(mix(0.25, 1.0, act), mix(0.15, 1.0, slow), amber);
    vec3 col = mix(vec3(0.35, 1.0, 0.5), vec3(1.0, 0.66, 0.2), amber);
    emit(w, ex * on * amountAt(c) * 3.2, 0.6, col);
    return;
  }
#elif KIND == ${M.ctf}
  {
    vec2 g = gridCell(id, ${CTF_N}.0, ${CTF_CELL}.0);
    vec3 hs = hash31(g.x * 7.13 + g.y * 1.71 + 3.3);
    vec2 p = (g + 0.15 + hs.xy * 0.7) * ${CTF_CELL}.0;
    float stepLen = 60.0;
    float e = 30.0;
    for (int i = 0; i < 12; i++) {
      vec2 gr = vec2(groundAt(p + vec2(e, 0.0)) - groundAt(p - vec2(e, 0.0)), groundAt(p + vec2(0.0, e)) - groundAt(p - vec2(0.0, e)));
      p += gr / max(length(gr), 1e-3) * stepLen;
      stepLen *= i < 6 ? 0.8 : 0.6;
      e = i < 6 ? 30.0 : 4.0;
      if (i == 6) stepLen = 10.0;
    }
    float h = groundAt(p);
    float ex = smoothstep(165.0, 190.0, h) * step(0.35, hs.z);
    if (ex < 0.01) { hide(); return; }
    float pulse = 0.3 + 0.7 * pow(0.5 + 0.5 * sin(u_time * 0.85 + hs.z * 40.0), 3.0);
    emit(vec3(p.x, h + 3.0, p.y), ex * pulse * amountAt(p) * 2.6, 2.6, vec3(1.0, 0.2, 0.14));
    return;
  }
#elif KIND == ${M.packets}
  {
    vec2 hc = vec2(${HUB[0]}.0, ${HUB[1]}.0);
    vec2 center = u_cam.xz + u_fwd * 700.0;
    vec2 cell = vec2(mod(id, ${HUB_N}.0), floor(id / ${HUB_N}.0)) - floor(${HUB_N}.0 * 0.5) + floor(center / hc);
    vec2 p = (cell + 0.25 + hash22(cell + 3.7) * 0.5) * hc;
    float br = 0.75 + 0.25 * sin(u_time * 1.3 + hash12(cell) * 30.0);
    emit(vec3(p.x, groundH(p) + 5.0, p.y), amountAt(p) * br * 2.6, 2.6, vec3(0.7, 0.95, 1.0));
    return;
  }
#else
  {
    float k = min(id, ${DRONE_TRAIL}.0);
    vec3 w = u_drone[int(k)];
    if (id > ${DRONE_TRAIL}.5) {
      float strobe = smoothstep(0.9, 0.93, fract(u_time * 0.75)) * (1.0 - smoothstep(0.95, 0.99, fract(u_time * 0.75)));
      emit(w + vec3(0.0, 1.2, 0.0), strobe * amountAt(w.xz) * 3.0, 1.4, vec3(1.0, 0.18, 0.12));
      return;
    }
    float tf = k / ${DRONE_TRAIL}.0;
    float a = id < 0.5 ? 3.0 : pow(1.0 - tf, 1.5) * 0.9;
    emit(w, a * amountAt(w.xz), id < 0.5 ? 2.2 : 1.3 * (1.0 - tf * 0.5), mix(vec3(1.0, 0.93, 0.8), vec3(0.7, 0.8, 1.0), tf));
    return;
  }
#endif
}`;

const POINT_FRAG = `#version 300 es
precision highp float;
in float v_a;
in vec3 v_col;
out vec4 o;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float d = dot(q, q);
  float g = exp(-d * 5.0) + exp(-d * 28.0) * 1.6;
  o = vec4(v_col * g * v_a * 1.6, 1.0);
}`;

const CITY_CELL = 64;
const CITY_N = 26;
const CITY_LIGHTS = 12;
const ARC_N = 14;
const ARC_SEG = 12;

const CITY_COMMON = `
const float CELL = ${CITY_CELL}.0;
vec3 city(vec2 g) {
  float ex = step(0.52, hash12(g + 0.37));
  vec2 c = (g + 0.2 + hash22(g) * 0.6) * CELL;
  float mc = sweepAt(c);
  vec3 s = mix(u_shapeA, u_shapeB, mc);
  float h = terrainH(c, s, mc);
  float around = (terrainH(c + vec2(55.0, 0.0), s, mc) + terrainH(c - vec2(55.0, 0.0), s, mc)) * 0.5;
  ex *= max(1.0 - smoothstep(50.0, 90.0, h), smoothstep(2.0, 14.0, around - h));
  return vec3(c, ex);
}
`;

const CITY_VERT = `${HEAD}
${CITY_COMMON}
out float v_a;
out vec3 v_col;
void main() {
  float id = float(gl_VertexID);
  float ci = floor(id / ${CITY_LIGHTS}.0);
  float li = mod(id, ${CITY_LIGHTS}.0);
  vec2 g = vec2(mod(ci, ${CITY_N}.0), floor(ci / ${CITY_N}.0)) - ${CITY_N / 2}.0 + floor(u_cam.xz / CELL);
  vec3 c = city(g);
  vec2 o = (hash22(g * 1.7 + li * 3.1) - 0.5) * (li < 0.5 ? 2.0 : 10.0 + li * 2.4);
  vec2 p = c.xy + o;
  vec3 w = vec3(p.x, groundH(p) + 3.0, p.y);
  gl_Position = u_viewProj * vec4(w, 1.0);
  float hs = hash12(g + li * 5.3);
  float tw = 0.75 + 0.25 * sin(u_time * (1.0 + hs * 3.0) + hs * 30.0);
  float a = c.z * fogA(w) * amountAt(p);
  v_a = a * tw * (li < 0.5 ? 3.0 : 1.5);
  v_col = mix(vec3(1.0, 0.8, 0.52), vec3(0.62, 0.9, 1.0), step(0.6, hs));
  gl_PointSize = sprite(a, u_pxScale * (li < 0.5 ? 1.3 : 0.7) / gl_Position.w, v_a);
}`;

const ARC_VERT = `${HEAD}
${CITY_COMMON}
out float v_a;
out float v_t;
out float v_seed;
void main() {
  float id = float(gl_VertexID);
  float seg = ${ARC_SEG}.0;
  float ai = floor(id / (seg * 2.0));
  float k = mod(id, seg * 2.0);
  float t = (floor(k / 2.0) + mod(k, 2.0)) / seg;
  float cell = floor(ai / 2.0);
  vec2 g = vec2(mod(cell, ${ARC_N}.0), floor(cell / ${ARC_N}.0)) - ${ARC_N / 2}.0 + floor(u_cam.xz / CELL);
  vec2 n = g + (mod(ai, 2.0) < 0.5 ? vec2(1.0, 0.0) : vec2(1.0, -1.0));
  vec3 a = city(g);
  vec3 b = city(n);
  float on = a.z * b.z * step(0.3, hash12(g * 2.3 + n));
  vec2 p = mix(a.xy, b.xy, t);
  float len = distance(a.xy, b.xy);
  float ha = groundH(a.xy);
  float hb = groundH(b.xy);
  vec3 w = vec3(p.x, mix(ha, hb, t) + sin(t * 3.14159) * len * 0.32 + 1.5, p.y);
  gl_Position = on < 0.5 ? vec4(2.0, 2.0, 2.0, 1.0) : u_viewProj * vec4(w, 1.0);
  v_a = on * fogA(w) * amountAt(p);
  v_t = t;
  v_seed = hash12(g + n * 3.0);
}`;

const ARC_FRAG = `#version 300 es
precision highp float;
in float v_a;
in float v_t;
in float v_seed;
uniform float u_time;
out vec4 o;
void main() {
  float s = fract(v_t * 0.5 - u_time * (0.12 + v_seed * 0.2) + v_seed * 7.0);
  float pulse = pow(s, 12.0) * 2.4 + smoothstep(0.97, 1.0, s) * 3.0;
  vec3 c = vec3(0.45, 0.85, 1.0) * (0.2 + pulse);
  o = vec4(c * v_a, 1.0);
}`;

const MOTIF_COUNTS: Record<number, number> = {
  [M.servers]: SRV_N * SRV_N * SRV_LEDS,
  [M.ctf]: CTF_N * CTF_N,
  [M.packets]: HUB_N * HUB_N,
  [M.drone]: DRONE_TRAIL + 2,
};

export class Particles {
  private flies!: Program;
  private cities!: Program;
  private arcs!: Program;
  private motifs = new Map<number, Program>();
  private vao!: WebGLVertexArrayObject;

  constructor(private gl: WebGL2RenderingContext, private count: number) {
    this.init();
  }

  init() {
    const gl = this.gl;
    this.flies = new Program(gl, FIREFLY_VERT, POINT_FRAG);
    this.cities = new Program(gl, CITY_VERT, POINT_FRAG);
    this.arcs = new Program(gl, ARC_VERT, ARC_FRAG);
    this.motifs.clear();
    for (const k of Object.keys(MOTIF_COUNTS).map(Number)) this.motifs.set(k, new Program(gl, motifVert(k), POINT_FRAG));
    this.vao = gl.createVertexArray()!;
  }

  private common(prog: Program, f: Frame, amount: number[]) {
    prog.use()
      .set('u_viewProj', f.viewProj)
      .set('u_cam', f.cam)
      .set('u_time', f.time)
      .set('u_far', f.far)
      .set('u_fog', f.p.fog)
      .set('u_pxScale', f.pxScale)
      .set('u_amount', amount)
      .set('u_minPx', 3.2 * f.dprScale)
      .set('u_shapeA', [f.a.amp, f.a.terrace, f.a.terraceStep])
      .set('u_shapeB', [f.b.amp, f.b.terrace, f.b.terraceStep])
      .set('u_varA', f.varA)
      .set('u_varB', f.varB)
      .set('u_motif', f.motif)
      .set('u_mq', f.mq)
      .set('u_front', f.front)
      .set('u_rip', f.ripples);
  }

  render(f: Frame, cursor: [number, number, number, number]) {
    const gl = this.gl;
    const { a, b } = f;
    const cities = [a.cities, b.cities];
    const flies = [a.fireflies, b.fireflies];
    const kinds = [...new Set(f.motif)].filter(k => MOTIF_COUNTS[k]);
    if (Math.max(...cities, ...flies) < 0.01 && !kinds.length) return;
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.bindVertexArray(this.vao);
    if (Math.max(...cities) > 0.01) {
      this.common(this.arcs, f, cities);
      gl.drawArrays(gl.LINES, 0, ARC_N * ARC_N * 2 * ARC_SEG * 2);
      this.common(this.cities, f, cities);
      gl.drawArrays(gl.POINTS, 0, CITY_N * CITY_N * CITY_LIGHTS);
    }
    for (const k of kinds) {
      const amount = [f.motif[0] === k ? 1 : 0, f.motif[1] === k ? 1 : 0];
      const prog = this.motifs.get(k)!;
      this.common(prog, f, amount);
      prog.set('u_fwd', f.fwd).set('u_minPx', 2 * f.dprScale);
      if (k === M.drone) prog.set('u_drone', f.drone);
      gl.drawArrays(gl.POINTS, 0, k === M.drone && f.reduced ? 1 : MOTIF_COUNTS[k]);
    }
    if (Math.max(...flies) > 0.01) {
      this.common(this.flies, f, flies);
      this.flies.set('u_fwd', f.fwd).set('u_cursor', cursor).set('u_box', 560).set('u_colorA', a.particle).set('u_colorB', b.particle);
      gl.drawArrays(gl.POINTS, 0, this.count);
    }
    gl.bindVertexArray(null);
  }

  dispose() {
    this.flies.dispose();
    this.cities.dispose();
    this.arcs.dispose();
    this.motifs.forEach(p => p.dispose());
  }
}
