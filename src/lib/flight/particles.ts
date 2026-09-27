import { Program } from './gl';
import { NOISE, TERRAIN, setTerrain } from './glsl';
import type { Frame } from './frame';
import { M } from './motifs';

const HEAD = `#version 300 es
precision highp float;
uniform mat4 u_viewProj;
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

const PULSE = 24;
export const DRONE_TRAIL = 28;

const motifVert = (kind: number) => `${HEAD}
#define KIND ${kind}
uniform vec2 u_fwd;
uniform vec3 u_drone[${DRONE_TRAIL + 1}];
uniform vec4 u_beacon;
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
void main() {
  float id = float(gl_VertexID);
#if KIND == ${M.ctf}
  {
    if (u_beacon.w < 0.003) { hide(); return; }
    float pulse = 0.6 + 0.4 * sin(u_time * 1.3);
    if (id < 1.5) {
      emit(u_beacon.xyz + vec3(0.0, 3.0, 0.0), u_beacon.w * pulse * (id < 0.5 ? 6.0 : 0.3), id < 0.5 ? 8.0 : 44.0, vec3(1.0, 0.2, 0.14));
      return;
    }
    float k = (id - 1.0) / 40.0;
    emit(u_beacon.xyz + vec3(0.0, 4.0 + k * 120.0, 0.0), u_beacon.w * pow(1.0 - k, 1.8) * (1.0 + 0.4 * pulse), 1.6, vec3(1.0, 0.3, 0.24));
    return;
  }
#elif KIND == ${M.packets}
  {
    vec2 hubs[3] = vec2[3](vec2(-300.0, -900.0), vec2(70.0, -600.0), vec2(330.0, -1020.0));
    vec3 warm = vec3(1.0, 0.8, 0.5);
    if (id < 2.5) {
      vec2 p = u_cam.xz + hubs[int(id)];
      emit(vec3(p.x, groundH(p) + 4.0, p.y), amountAt(p) * 2.2, 5.0, warm);
      return;
    }
    float li = floor((id - 3.0) / ${PULSE}.0);
    float j = mod(id - 3.0, ${PULSE}.0);
    int ia = int(li);
    int ib = int(mod(li + 1.0, 3.0));
    vec2 pa = u_cam.xz + hubs[ia];
    vec2 pb = u_cam.xz + hubs[ib];
    float per = 9.0 + li * 2.7;
    float ph = fract(u_time / per + li * 0.37);
    float s = ph / 0.72 - j * 0.011;
    if (s < 0.0 || s > 1.0 || ph > 0.8) { hide(); return; }
    if (mod(li, 2.0) > 0.5) s = 1.0 - s;
    vec2 p = mix(pa, pb, s);
    float ya = groundH(pa) + 4.0;
    float yb = groundH(pb) + 4.0;
    float y = mix(ya, yb, s) + sin(s * 3.14159) * distance(pa, pb) * 0.07;
    float a = pow(1.0 - j / ${PULSE}.0, 1.6) * (j < 0.5 ? 3.2 : 1.5) * smoothstep(0.0, 0.05, s) * smoothstep(1.0, 0.95, s);
    emit(vec3(p.x, y, p.y), a * amountAt(p), j < 0.5 ? 4.0 : 2.6, mix(vec3(1.0, 0.95, 0.85), warm, j / ${PULSE}.0));
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

const MOTIF_COUNTS: Record<number, number> = {
  [M.ctf]: 42,
  [M.packets]: 3 + 3 * PULSE,
  [M.drone]: DRONE_TRAIL + 2,
};

export class Particles {
  private flies!: Program;
  private motifs = new Map<number, Program>();
  private vao!: WebGLVertexArrayObject;

  constructor(private gl: WebGL2RenderingContext, private count: number) {
    this.init();
  }

  get programs(): Program[] {
    return [this.flies, ...this.motifs.values()];
  }

  init() {
    const gl = this.gl;
    this.flies = new Program(gl, FIREFLY_VERT, POINT_FRAG);
    this.motifs.clear();
    for (const k of Object.keys(MOTIF_COUNTS).map(Number)) this.motifs.set(k, new Program(gl, motifVert(k), POINT_FRAG));
    this.vao = gl.createVertexArray()!;
  }

  private common(prog: Program, f: Frame, amount: number[]) {
    prog.use()
      .set('u_viewProj', f.viewProj)
      .set('u_time', f.time)
      .set('u_far', f.far)
      .set('u_fog', f.p.fog)
      .set('u_pxScale', f.pxScale)
      .set('u_amount', amount)
      .set('u_minPx', 3.2 * f.dprScale);
    setTerrain(prog, f);
  }

  render(f: Frame, cursor: [number, number, number, number], warm = false) {
    const gl = this.gl;
    const { a, b } = f;
    const flies = [a.fireflies, b.fireflies];
    const kinds = warm ? [...this.motifs.keys()] : [...new Set(f.motif)].filter(k => MOTIF_COUNTS[k]);
    if (Math.max(...flies) < 0.01 && !kinds.length && !warm) return;
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.bindVertexArray(this.vao);
    for (const k of kinds) {
      const amount = [f.motif[0] === k ? 1 : 0, f.motif[1] === k ? 1 : 0];
      const prog = this.motifs.get(k)!;
      this.common(prog, f, amount);
      prog.set('u_fwd', f.fwd).set('u_minPx', 2 * f.dprScale);
      if (k === M.drone) prog.set('u_drone', f.drone);
      if (k === M.ctf) prog.set('u_beacon', f.beacon);
      gl.drawArrays(gl.POINTS, 0, warm || (k === M.drone && f.reduced) ? 1 : MOTIF_COUNTS[k]);
    }
    if (Math.max(...flies) > 0.01 || warm) {
      this.common(this.flies, f, flies);
      this.flies.set('u_fwd', f.fwd).set('u_cursor', cursor).set('u_box', 560).set('u_colorA', a.particle).set('u_colorB', b.particle);
      gl.drawArrays(gl.POINTS, 0, warm ? 1 : this.count);
    }
    gl.bindVertexArray(null);
  }

  dispose() {
    this.flies.dispose();
    this.motifs.forEach(p => p.dispose());
  }
}
