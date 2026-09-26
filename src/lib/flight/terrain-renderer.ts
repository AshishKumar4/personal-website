import { FULLSCREEN_VERT, Program, fullscreenTriangle } from './gl';
import { NOISE, TERRAIN } from './glsl';
import type { Frame } from './frame';

const meshVert = (lit: boolean) => `#version 300 es
precision highp float;
${lit ? '#define LIT 1' : ''}
in vec2 a_pos;
uniform mat4 u_viewProj;
uniform vec3 u_cam;
uniform vec2 u_spacing;
uniform vec2 u_rot;
uniform float u_far;
uniform float u_fog;
uniform float u_intro;
uniform float u_jitter;
uniform float u_seed;
out vec3 v_world;
out float v_alpha;
out float v_fog;
out float v_light;
out float v_dist;
out float v_ring;
out float v_rim;
out float v_row;
${NOISE}
${TERRAIN}
void main() {
  mat2 R = mat2(u_rot.x, u_rot.y, -u_rot.y, u_rot.x);
  vec2 camL = transpose(R) * u_cam.xz;
  vec2 snap = floor(camL / u_spacing) * u_spacing;
  vec2 local = vec2(snap.x + a_pos.x * u_spacing.x, snap.y + u_spacing.y - a_pos.y * u_spacing.y);
  vec2 xz = R * local;
  v_row = floor(local.y / u_spacing.y + 0.5);
  float h0 = terrainH(xz);
  float h = h0;
  vec2 rp = ripple(xz);
  h += rp.x * 13.0;
  if (u_jitter > 0.001) {
    vec2 id = vec2(floor(local.x / u_spacing.x + 0.5), v_row);
    float s0 = floor(u_seed);
    float k = smoothstep(0.0, 1.0, fract(u_seed));
    vec2 o0 = hash22(id + s0 * 17.13) - 0.5;
    vec2 o1 = hash22(id + (s0 + 1.0) * 17.13) - 0.5;
    vec2 off = mix(o0, o1, k);
    float j = u_jitter;
    h = terrainH(xz + off * 84.0 * j) + ripple(xz).x * 13.0 + (off.x + off.y) * 26.0 * j * j;
    xz += R * vec2(0.0, off.y * u_spacing.y * 0.8 * j);
  }
  float lambert = 0.0;
  float rim = 0.0;
  vec3 world = vec3(xz.x, h, xz.y);
#ifdef LIT
  float e = 2.0;
  vec3 n = normalize(vec3(h0 - terrainH(xz + vec2(e, 0.0)), e, h0 - terrainH(xz + vec2(0.0, e))));
  vec3 moon = normalize(vec3(-0.6, 0.5, -0.62));
  lambert = clamp(dot(n, moon), 0.0, 1.0);
  vec3 v = normalize(u_cam - world);
  rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0) * smoothstep(15.0, 110.0, h0);
#endif
  gl_Position = u_viewProj * vec4(world, 1.0);
  float dist = length(world.xz - u_cam.xz);
  v_world = world;
  v_dist = dist / u_far;
  v_fog = smoothstep(u_far * u_fog, u_far * 0.97, dist);
  float near = smoothstep(10.0, 70.0, dist);
  float reveal = smoothstep(u_intro * u_far, u_intro * u_far - 140.0, dist);
  float snow = smoothstep(110.0, 200.0, h0);
  v_light = 0.16 + lambert * (0.85 + snow * 0.8) + snow * 0.25;
  v_alpha = (1.0 - v_fog) * near * reveal;
  v_ring = rp.y;
  v_rim = rim;
}`;

const MESH_IN = `
in vec3 v_world;
in float v_alpha;
in float v_fog;
in float v_light;
in float v_dist;
in float v_ring;
in float v_rim;
in float v_row;
uniform vec4 u_lantern;
uniform vec3 u_lanternColor;
uniform float u_time;
out vec4 o;
`;

const LINE_FRAG = `#version 300 es
precision highp float;
${MESH_IN}
uniform vec3 u_line;
uniform vec3 u_lineFar;
uniform vec3 u_rimColor;
uniform float u_farMix;
uniform float u_lineGain;
uniform float u_rimAmt;
uniform float u_packets;
float h1(float n) { return fract(sin(n * 91.345) * 47453.5453); }
void main() {
  vec3 col = mix(u_line, u_lineFar, clamp(v_dist * 1.4 - 0.1, 0.0, 1.0) * u_farMix) * v_light * u_lineGain;
  col += u_rimColor * v_rim * u_rimAmt;
  float d = distance(v_world.xz, u_lantern.xy);
  float l = u_lantern.w * (exp(-d * d / 2600.0) * 1.7 + exp(-d / 110.0) * 0.4);
  col += u_lanternColor * l * (0.45 + v_light);
  col += mix(u_lanternColor, vec3(1.0), 0.5) * v_ring * 2.2;
  if (u_packets > 0.001) {
    float rh = h1(v_row);
    if (rh < 0.3 * u_packets) {
      float dir = rh < 0.15 * u_packets ? 1.0 : -1.0;
      float s = fract(v_world.x * dir / 420.0 - u_time * (0.18 + rh * 1.1) + rh * 13.0);
      float p = pow(s, 9.0) * 0.8 + pow(s, 60.0) * 2.5;
      col += vec3(0.62, 0.92, 1.0) * p * (0.45 + 0.55 * smoothstep(10.0, 120.0, v_world.y)) * 2.8 * u_packets;
    }
  }
  o = vec4(col, v_alpha * 0.85);
}`;

const ATMOS = `
uniform vec3 u_top;
uniform vec3 u_horizon;
uniform vec3 u_glow;
uniform float u_glowAmt;
uniform float u_sun;
uniform vec2 u_sunDir;
vec3 sph(float az, float el) {
  return vec3(sin(az) * cos(el), sin(el), -cos(az) * cos(el));
}
vec3 atmos(vec3 d) {
  float el = max(d.y, 0.0);
  float az = atan(d.x, -d.z);
  vec3 col = mix(u_horizon, u_top, smoothstep(0.0, 0.42, el));
  float toward = pow(max(cos(az - u_sunDir.x), 0.0), 2.0);
  col += u_glow * u_glowAmt * exp(-el * mix(9.0, 4.5, u_sun)) * mix(1.0, 0.3 + 1.2 * toward, u_sun);
  if (u_sun > 0.001) {
    float c = max(dot(normalize(vec3(d.x, el, d.z)), sph(u_sunDir.x, u_sunDir.y)), 0.0);
    col += u_glow * (pow(c, 6.0) * 0.14 + pow(c, 70.0) * 0.45) * u_sun;
  }
  return col;
}
`;

const FILL_FRAG = `#version 300 es
precision highp float;
${MESH_IN}
uniform vec3 u_fill;
uniform vec3 u_cam;
${ATMOS}
void main() {
  vec3 fogc = atmos(normalize(vec3(v_world.x - u_cam.x, 0.0, v_world.z - u_cam.z)));
  vec3 col = mix(u_fill, fogc, v_fog);
  float d = distance(v_world.xz, u_lantern.xy);
  col += u_lanternColor * u_lantern.w * exp(-d * d / 5000.0) * 0.05;
  col += u_lanternColor * v_ring * 0.04;
  o = vec4(col, 1.0);
}`;

const SKY_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform mat4 u_inv;
uniform vec3 u_cam;
uniform float u_stars;
uniform float u_moon;
uniform float u_aurora;
uniform float u_time;
uniform float u_pxPerRad;
out vec4 o;
${NOISE}
${ATMOS}
void main() {
  vec4 a = u_inv * vec4(v_uv * 2.0 - 1.0, 1.0, 1.0);
  vec3 d = normalize(a.xyz / a.w - u_cam);
  float el = d.y;
  float az = atan(d.x, -d.z);
  vec3 col = atmos(d);
  if (u_sun > 0.001) {
    vec3 sd = sph(u_sunDir.x, u_sunDir.y);
    float c = max(dot(d, sd), 0.0);
    float ang = acos(clamp(dot(d, sd), -1.0, 1.0));
    float disc = smoothstep(0.024, 0.02, ang) * smoothstep(-0.004, 0.006, el);
    col += u_glow * pow(c, 900.0) * 0.8 * u_sun * step(0.0, el);
    col += vec3(1.0, 0.84, 0.62) * disc * u_sun * 2.6;
  }
  if (u_moon > 0.001) {
    vec3 md = sph(0.46, 0.105);
    float ang = acos(clamp(dot(d, md), -1.0, 1.0));
    float disc = smoothstep(0.0105, 0.0085, ang);
    float shadow = smoothstep(0.0095, 0.0075, acos(clamp(dot(d, sph(0.4535, 0.108)), -1.0, 1.0)));
    col += vec3(0.8, 0.86, 1.0) * (disc * (1.0 - shadow * 0.92) * 1.6 + exp(-ang * 26.0) * 0.07 + exp(-ang * 7.0) * 0.02) * u_moon;
  }
  if (u_stars > 0.001 && el > 0.0) {
    vec2 sp = vec2(az, el) * (u_pxPerRad / 7.0);
    vec2 cell = floor(sp);
    float hs = hash12(cell);
    if (hs > 0.972) {
      vec2 off = hash22(cell) - 0.5;
      float dd = length(fract(sp) - 0.5 - off * 0.6) * 7.0;
      float b = pow(hash12(cell + 3.1), 5.0) * 2.2 + 0.2;
      float tw = 0.7 + 0.3 * sin(u_time * (0.7 + hs * 3.0) + hs * 40.0);
      col += vec3(0.82, 0.88, 1.0) * exp(-dd * dd * 1.1) * b * tw * u_stars * smoothstep(0.004, 0.08, el);
    }
  }
  if (u_aurora > 0.001 && el > -0.02) {
    float t = u_time;
    float x = az * 2.4;
    float base = 0.06 + 0.035 * snoise(vec2(x * 0.7 + t * 0.012, 3.0));
    float fold = snoise(vec2(x * 1.6 + snoise(vec2(x * 0.5, t * 0.02)) * 0.8, t * 0.03));
    float e = el - base - fold * 0.012;
    float band = smoothstep(-0.05, 0.006, e) * exp(-max(e, 0.0) * 12.0) * (0.35 + 0.65 * smoothstep(-0.01, 0.004, e));
    float rays = 0.45 + 0.55 * smoothstep(-0.4, 0.9, snoise(vec2(az * 55.0 + fold * 6.0, t * 0.12)));
    float breath = 0.55 + 0.45 * snoise(vec2(x * 0.9 - t * 0.02, 9.0));
    vec3 ac = mix(vec3(0.25, 1.0, 0.62), vec3(0.55, 0.35, 1.0), smoothstep(0.0, 0.14, e));
    col += ac * band * rays * breath * u_aurora * 0.42;
  }
  o = vec4(col, 1.0);
}`;

export class TerrainRenderer {
  private lines!: Program;
  private fill!: Program;
  private sky!: Program;
  private meshVao!: WebGLVertexArrayObject;
  private skyVao!: WebGLVertexArrayObject;
  private triIndices!: WebGLBuffer;
  private lineIndices!: WebGLBuffer;
  private triCount = 0;
  private lineCount = 0;
  private spacing: [number, number];

  constructor(private gl: WebGL2RenderingContext, density: number, private far: number) {
    this.spacing = [2.6 / density, 6.5 / density];
    this.init();
  }

  init() {
    const gl = this.gl;
    this.lines = new Program(gl, meshVert(true), LINE_FRAG);
    this.fill = new Program(gl, meshVert(false), FILL_FRAG);
    this.sky = new Program(gl, FULLSCREEN_VERT, SKY_FRAG);
    const half = Math.round(900 / this.spacing[0]);
    const cols = half * 2 + 1;
    const rows = Math.ceil(this.far / this.spacing[1]) + 2;
    const grid = new Float32Array(cols * rows * 2);
    let k = 0;
    for (let j = 0; j < rows; j++) {
      for (let i = -half; i <= half; i++) {
        grid[k++] = i;
        grid[k++] = j;
      }
    }
    const tris = new Uint32Array((cols - 1) * (rows - 1) * 6);
    k = 0;
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = j * cols + i;
        const c = a + cols;
        tris[k++] = a; tris[k++] = c; tris[k++] = a + 1;
        tris[k++] = a + 1; tris[k++] = c; tris[k++] = c + 1;
      }
    }
    const lines = new Uint32Array(rows * (cols - 1) * 2);
    k = 0;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols - 1; i++) {
        lines[k++] = j * cols + i;
        lines[k++] = j * cols + i + 1;
      }
    }
    this.triCount = tris.length;
    this.lineCount = lines.length;
    this.meshVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.meshVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.triIndices = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tris, gl.STATIC_DRAW);
    this.lineIndices = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.lineIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, lines, gl.STATIC_DRAW);
    this.skyVao = fullscreenTriangle(gl);
  }

  private mesh(prog: Program, f: Frame) {
    const p = f.p;
    prog.use()
      .set('u_viewProj', f.viewProj)
      .set('u_cam', f.cam)
      .set('u_spacing', this.spacing)
      .set('u_rot', [Math.cos(f.rot), Math.sin(f.rot)])
      .set('u_far', f.far)
      .set('u_fog', p.fog)
      .set('u_intro', f.intro)
      .set('u_jitter', p.jitter)
      .set('u_seed', f.seed)
      .set('u_amp', p.amp)
      .set('u_terrace', p.terrace)
      .set('u_terraceStep', p.terraceStep)
      .set('u_rip', f.ripples)
      .set('u_lantern', f.lantern)
      .set('u_lanternColor', f.lanternColor)
      .set('u_time', f.time);
  }

  private atmos(prog: Program, f: Frame) {
    const p = f.p;
    prog
      .set('u_top', p.skyTop)
      .set('u_horizon', p.skyHorizon)
      .set('u_glow', p.glow)
      .set('u_glowAmt', p.glowAmt)
      .set('u_sun', p.sun)
      .set('u_sunDir', f.sunDir);
  }

  render(f: Frame) {
    const gl = this.gl;
    const p = f.p;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    this.sky.use()
      .set('u_inv', f.inv)
      .set('u_cam', f.cam)
      .set('u_stars', p.stars)
      .set('u_moon', p.moon)
      .set('u_aurora', p.aurora)
      .set('u_time', f.time)
      .set('u_pxPerRad', f.pxPerRad);
    this.atmos(this.sky, f);
    gl.bindVertexArray(this.skyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.bindVertexArray(this.meshVao);
    this.mesh(this.fill, f);
    this.fill.set('u_fill', p.fill);
    this.atmos(this.fill, f);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.5, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triIndices);
    gl.drawElements(gl.TRIANGLES, this.triCount, gl.UNSIGNED_INT, 0);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.depthMask(false);
    this.mesh(this.lines, f);
    this.lines
      .set('u_line', f.line)
      .set('u_lineFar', p.lineFar)
      .set('u_rimColor', p.rim)
      .set('u_farMix', p.farMix)
      .set('u_lineGain', p.lineGain)
      .set('u_rimAmt', p.rimAmt)
      .set('u_packets', p.packets);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.lineIndices);
    gl.drawElements(gl.LINES, this.lineCount, gl.UNSIGNED_INT, 0);
    gl.bindVertexArray(null);
  }

  dispose() {
    this.lines.dispose();
    this.fill.dispose();
    this.sky.dispose();
  }
}
