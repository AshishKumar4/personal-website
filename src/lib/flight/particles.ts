import { Program } from './gl';
import { NOISE, TERRAIN } from './glsl';
import type { Frame } from './frame';

const HEAD = `#version 300 es
precision highp float;
uniform mat4 u_viewProj;
uniform vec3 u_cam;
uniform float u_time;
uniform float u_far;
uniform float u_fog;
uniform float u_pxScale;
uniform float u_amount;
uniform float u_minPx;
${NOISE}
${TERRAIN}
float groundH(vec2 p) {
  return terrainH(p) + ripple(p).x * 13.0;
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
uniform vec3 u_color;
void main() {
  float id = float(gl_VertexID);
  vec3 r = hash31(id * 1.618 + 0.5);
  vec3 r2 = hash31(id * 0.713 + 11.0);
  vec2 center = u_cam.xz + u_fwd * u_box * 0.42;
  vec2 home = r.xy * u_box;
  vec2 p = mod(home - center + u_box * 0.5, u_box) - u_box * 0.5 + center;
  float edge = max(abs(p.x - center.x), abs(p.y - center.y)) / (u_box * 0.5);
  float t = u_time * (0.04 + r.z * 0.05);
  p += vec2(snoise(p * 0.005 + vec2(t, 1.7)), snoise(p * 0.005 + vec2(4.3, t))) * 34.0;
  vec2 toC = u_cursor.xy - p;
  float dc = length(toC);
  float pull = u_cursor.w * smoothstep(210.0, 30.0, dc);
  float ang = atan(-toC.y, -toC.x) + u_time * (0.25 + r2.x * 0.5) * (r2.y > 0.5 ? 1.0 : -1.0);
  vec2 orbit = u_cursor.xy + vec2(cos(ang), sin(ang)) * (10.0 + r2.z * 55.0);
  p = mix(p, orbit, pull * 0.82);
  vec2 rp = ripple(p);
  float y = terrainH(p) + rp.x * 13.0 + 6.0 + r.z * r.z * 48.0 + sin(u_time * (0.6 + r.x) + id) * 3.0;
  y = mix(y, max(y, u_cursor.z + 8.0 + r2.z * 34.0), pull * 0.7);
  vec3 w = vec3(p.x, y, p.y);
  gl_Position = u_viewProj * vec4(w, 1.0);
  float blink = 0.25 + 0.75 * pow(0.5 + 0.5 * sin(u_time * (0.8 + r2.x * 2.2) + r2.y * 40.0), 3.0);
  float a = fogA(w) * (1.0 - smoothstep(0.82, 1.0, edge)) * u_amount;
  v_a = a * blink * (1.0 + pull * 0.8 + rp.y * 2.0);
  v_col = mix(u_color, vec3(1.0, 0.72, 0.36), step(0.86, r2.x));
  gl_PointSize = sprite(a, u_pxScale * (0.7 + r.x * 0.8) / gl_Position.w, v_a);
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
const CITY_LIGHTS = 7;
const ARC_N = 18;
const ARC_SEG = 14;

const CITY_COMMON = `
const float CELL = ${CITY_CELL}.0;
vec3 city(vec2 g) {
  float ex = step(0.52, hash12(g + 0.37));
  vec2 c = (g + 0.2 + hash22(g) * 0.6) * CELL;
  float h = terrainH(c);
  ex *= 1.0 - smoothstep(40.0, 90.0, h);
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
  vec2 o = (hash22(g * 1.7 + li * 3.1) - 0.5) * (li < 0.5 ? 2.0 : 26.0);
  vec2 p = c.xy + o;
  vec3 w = vec3(p.x, groundH(p) + 1.2, p.y);
  gl_Position = u_viewProj * vec4(w, 1.0);
  float hs = hash12(g + li * 5.3);
  float tw = 0.75 + 0.25 * sin(u_time * (1.0 + hs * 3.0) + hs * 30.0);
  float a = c.z * fogA(w) * u_amount;
  v_a = a * tw * (li < 0.5 ? 1.8 : 0.9);
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
  float on = a.z * b.z * step(0.35, hash12(g * 2.3 + n));
  vec2 p = mix(a.xy, b.xy, t);
  float len = distance(a.xy, b.xy);
  float ha = groundH(a.xy);
  float hb = groundH(b.xy);
  vec3 w = vec3(p.x, mix(ha, hb, t) + sin(t * 3.14159) * len * 0.32 + 1.5, p.y);
  gl_Position = on < 0.5 ? vec4(2.0, 2.0, 2.0, 1.0) : u_viewProj * vec4(w, 1.0);
  v_a = on * fogA(w) * u_amount;
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
  float pulse = smoothstep(0.93, 1.0, s) * 2.5;
  vec3 c = vec3(0.45, 0.85, 1.0) * (0.14 + pulse);
  o = vec4(c * v_a, 1.0);
}`;

export class Particles {
  private flies!: Program;
  private cities!: Program;
  private arcs!: Program;
  private vao!: WebGLVertexArrayObject;

  constructor(private gl: WebGL2RenderingContext, private count: number) {
    this.init();
  }

  init() {
    const gl = this.gl;
    this.flies = new Program(gl, FIREFLY_VERT, POINT_FRAG);
    this.cities = new Program(gl, CITY_VERT, POINT_FRAG);
    this.arcs = new Program(gl, ARC_VERT, ARC_FRAG);
    this.vao = gl.createVertexArray()!;
  }

  private common(prog: Program, f: Frame, amount: number) {
    prog.use()
      .set('u_viewProj', f.viewProj)
      .set('u_cam', f.cam)
      .set('u_time', f.time)
      .set('u_far', f.far)
      .set('u_fog', f.p.fog)
      .set('u_pxScale', f.pxScale)
      .set('u_amount', amount)
      .set('u_minPx', 3.2 * f.dprScale)
      .set('u_amp', f.p.amp)
      .set('u_terrace', f.p.terrace)
      .set('u_terraceStep', f.p.terraceStep)
      .set('u_rip', f.ripples);
  }

  render(f: Frame, cursor: [number, number, number, number]) {
    const gl = this.gl;
    const p = f.p;
    if (p.cities < 0.01 && p.fireflies < 0.01) return;
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.bindVertexArray(this.vao);
    if (p.cities > 0.01) {
      this.common(this.arcs, f, p.cities);
      gl.drawArrays(gl.LINES, 0, ARC_N * ARC_N * 2 * ARC_SEG * 2);
      this.common(this.cities, f, p.cities);
      gl.drawArrays(gl.POINTS, 0, CITY_N * CITY_N * CITY_LIGHTS);
    }
    if (p.fireflies > 0.01) {
      this.common(this.flies, f, p.fireflies);
      this.flies.set('u_fwd', f.fwd).set('u_cursor', cursor).set('u_box', 560).set('u_color', p.particle);
      gl.drawArrays(gl.POINTS, 0, this.count);
    }
    gl.bindVertexArray(null);
  }

  dispose() {
    this.flies.dispose();
    this.cities.dispose();
    this.arcs.dispose();
  }
}
