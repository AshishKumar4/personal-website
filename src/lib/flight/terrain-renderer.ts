import { FULLSCREEN_VERT, Program, fullscreenTriangle } from './gl';
import { NOISE, TERRAIN } from './glsl';
import type { Frame } from './frame';

const meshVert = (lit: boolean) => `#version 300 es
precision highp float;
${lit ? '#define LIT 1' : ''}
in vec2 a_pos;
uniform mat4 u_viewProj;
uniform vec2 u_spacing;
uniform float u_far;
uniform float u_fog;
uniform float u_intro;
uniform vec2 u_jitter;
uniform float u_seed;
uniform float u_mist;
out vec3 v_world;
out float v_alpha;
out float v_fog;
out float v_light;
out float v_dist;
out float v_ring;
out float v_rim;
out float v_row;
out float v_mix;
out float v_seam;
out float v_mist;
${NOISE}
${TERRAIN}
void main() {
  vec2 snap = floor(u_cam.xz / u_spacing) * u_spacing;
  vec2 local = vec2(snap.x + a_pos.x * u_spacing.x, snap.y + u_spacing.y - a_pos.y * u_spacing.y);
  vec2 xz = local;
  v_row = floor(local.y / u_spacing.y + 0.5);
  float m = sweepAt(xz);
  vec3 shape = mix(u_shapeA, u_shapeB, m);
  float h0 = terrainH(xz, shape);
  vec2 rp = ripple(xz);
  float seam = seamAt(xz);
  float h = h0 + rp.x * 13.0 + seam * 9.0;
  float j = mix(u_jitter.x, u_jitter.y, m);
  if (j > 0.001) {
    vec2 id = vec2(floor(local.x / u_spacing.x + 0.5), v_row);
    float s0 = floor(u_seed);
    float k = smoothstep(0.0, 1.0, fract(u_seed));
    vec2 off = mix(hash22(id + s0 * 17.13), hash22(id + (s0 + 1.0) * 17.13), k) - 0.5;
    h = terrainH(xz + off * 44.0 * j, shape) + rp.x * 13.0 + seam * 9.0 + (off.x + off.y) * 20.0 * j * j;
    xz.y += off.y * u_spacing.y * 0.8 * j;
  }
  float lambert = 0.0;
  float rim = 0.0;
  vec3 world = vec3(xz.x, h, xz.y);
#ifdef LIT
  float e = 2.0;
  vec3 n = normalize(vec3(h0 - terrainH(xz + vec2(e, 0.0), shape), e, h0 - terrainH(xz + vec2(0.0, e), shape)));
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
  v_mist = exp(-max(h, 0.0) / 34.0) * smoothstep(50.0, 480.0, dist) * u_mist;
  v_alpha = (1.0 - v_fog) * near * reveal * (1.0 - v_mist * 0.6);
  v_ring = rp.y;
  v_rim = rim;
  v_mix = m;
  v_seam = seam;
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
in float v_mix;
in float v_seam;
in float v_mist;
uniform vec4 u_lantern;
uniform vec3 u_lanternColor;
uniform float u_time;
out vec4 o;
`;

const LINE_FRAG = `#version 300 es
precision highp float;
${MESH_IN}
uniform vec3 u_lineA;
uniform vec3 u_lineB;
uniform vec3 u_lineFarA;
uniform vec3 u_lineFarB;
uniform vec3 u_rimA;
uniform vec3 u_rimB;
uniform vec4 u_lsA;
uniform vec4 u_lsB;
float h1(float n) { return fract(sin(n * 91.345) * 47453.5453); }
void main() {
  vec4 ls = mix(u_lsA, u_lsB, v_mix);
  vec3 line = mix(u_lineA, u_lineB, v_mix);
  vec3 col = mix(line, mix(u_lineFarA, u_lineFarB, v_mix), clamp(v_dist * 1.4 - 0.1, 0.0, 1.0) * ls.x) * v_light * ls.y;
  col += mix(u_rimA, u_rimB, v_mix) * v_rim * ls.z;
  float d = distance(v_world.xz, u_lantern.xy);
  float l = u_lantern.w * (exp(-d * d / 2600.0) * 1.7 + exp(-d / 110.0) * 0.4);
  col += u_lanternColor * l * (0.45 + v_light);
  col += mix(u_lanternColor, vec3(1.0), 0.5) * v_ring * 2.2;
  col += mix(u_lineB, vec3(1.0), 0.35) * v_seam * 2.4;
  if (ls.w > 0.001) {
    float rh = h1(v_row);
    if (rh < 0.3 * ls.w) {
      float dir = rh < 0.15 * ls.w ? 1.0 : -1.0;
      float s = fract(v_world.x * dir / 420.0 - u_time * (0.18 + rh * 1.1) + rh * 13.0);
      float p = pow(s, 9.0) * 0.8 + pow(s, 60.0) * 2.5;
      col += vec3(0.62, 0.92, 1.0) * p * (0.45 + 0.55 * smoothstep(10.0, 120.0, v_world.y)) * 2.8 * ls.w;
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
    col += u_glow * (pow(c, 6.0) * 0.12 + pow(c, 70.0) * 0.4) * u_sun;
  }
  return col;
}
`;

const FILL_FRAG = `#version 300 es
precision highp float;
${MESH_IN}
uniform vec3 u_fillA;
uniform vec3 u_fillB;
uniform vec3 u_cam;
${ATMOS}
void main() {
  vec3 fogc = atmos(normalize(vec3(v_world.x - u_cam.x, 0.0, v_world.z - u_cam.z)));
  vec3 col = mix(mix(u_fillA, u_fillB, v_mix), fogc, v_fog);
  col = mix(col, fogc * 1.2, v_mist * 0.7);
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
uniform float u_clouds;
uniform float u_time;
uniform float u_pxPerRad;
out vec4 o;
${NOISE}
${ATMOS}
float fbm3(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * snoise(p);
    p = p * 2.03 + vec2(7.1, 3.3);
    a *= 0.5;
  }
  return s;
}
void main() {
  vec4 a = u_inv * vec4(v_uv * 2.0 - 1.0, 1.0, 1.0);
  vec3 d = normalize(a.xyz / a.w - u_cam);
  float el = d.y;
  float az = atan(d.x, -d.z);
  vec3 col = atmos(d);
  vec3 md = sph(0.42, 0.048);
  float mang = acos(clamp(dot(d, md), -1.0, 1.0));
  if (u_sun > 0.001) {
    vec3 sd = sph(u_sunDir.x, u_sunDir.y);
    float c = max(dot(d, sd), 0.0);
    float ang = acos(clamp(dot(d, sd), -1.0, 1.0));
    float disc = smoothstep(0.024, 0.02, ang) * smoothstep(-0.004, 0.006, el);
    col += u_glow * pow(c, 900.0) * 0.8 * u_sun * step(0.0, el);
    col += vec3(1.0, 0.84, 0.62) * disc * u_sun * 2.6;
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
      col += vec3(0.82, 0.88, 1.0) * exp(-dd * dd * 1.1) * b * tw * u_stars * smoothstep(0.004, 0.08, el) * smoothstep(0.02, 0.06, mang);
    }
  }
  if (u_moon > 0.001) {
    float disc = smoothstep(0.0165, 0.0145, mang);
    float shadow = smoothstep(0.0158, 0.0136, acos(clamp(dot(d, sph(0.4085, 0.0525)), -1.0, 1.0)));
    float tex = 0.85 + 0.15 * snoise(vec2(az, el) * 900.0);
    col += vec3(0.86, 0.9, 1.0) * (disc * (1.0 - shadow * 0.94) * 2.4 * tex + exp(-mang * 30.0) * 0.1 + exp(-mang * 6.0) * 0.035) * u_moon;
  }
  if (u_aurora > 0.001 && el > -0.02) {
    float t = u_time;
    float x = az * 2.4;
    float base = 0.03 + 0.025 * snoise(vec2(x * 0.7 + t * 0.012, 3.0));
    float fold = snoise(vec2(x * 1.6 + snoise(vec2(x * 0.5, t * 0.02)) * 0.8, t * 0.03));
    float e = el - base - fold * 0.012;
    float band = smoothstep(-0.05, 0.006, e) * exp(-max(e, 0.0) * 12.0) * (0.35 + 0.65 * smoothstep(-0.01, 0.004, e));
    float rays = 0.45 + 0.55 * smoothstep(-0.4, 0.9, snoise(vec2(az * 55.0 + fold * 6.0, t * 0.12)));
    float breath = 0.55 + 0.45 * snoise(vec2(x * 0.9 - t * 0.02, 9.0));
    vec3 ac = mix(vec3(0.25, 1.0, 0.62), vec3(0.55, 0.35, 1.0), smoothstep(0.0, 0.14, e));
    col += ac * band * rays * breath * u_aurora * 0.42;
  }
  if (u_clouds > 0.001 && el > -0.01) {
    float y = max(el, 0.0) + 0.04;
    vec2 q = d.xz / y * 0.55 + vec2(u_time * 0.02, u_time * 0.004);
    float n = fbm3(q * vec2(0.22, 0.6));
    float dens = smoothstep(0.02, 0.5, n) * smoothstep(-0.01, 0.02, el) * (1.0 - smoothstep(0.05, 0.16, el));
    vec3 lit = u_glow * u_glowAmt * (1.2 + 3.0 * u_sun * pow(max(cos(az - u_sunDir.x), 0.0), 3.0));
    vec3 cc = mix(u_top * 1.5 + u_horizon * 0.5, u_horizon + lit, smoothstep(-0.2, 0.6, n) * 0.8);
    cc += vec3(0.7, 0.78, 1.0) * u_moon * exp(-mang * 8.0) * 0.25;
    col = mix(col, cc, dens * u_clouds * 0.85);
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
    const { a, b } = f;
    prog.use()
      .set('u_viewProj', f.viewProj)
      .set('u_cam', f.cam)
      .set('u_spacing', this.spacing)
      .set('u_far', f.far)
      .set('u_fog', f.p.fog)
      .set('u_intro', f.intro)
      .set('u_jitter', [a.jitter, b.jitter])
      .set('u_seed', f.seed)
      .set('u_mist', f.p.mist)
      .set('u_shapeA', [a.amp, a.terrace, a.terraceStep])
      .set('u_shapeB', [b.amp, b.terrace, b.terraceStep])
      .set('u_front', f.front)
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
    const { a, b, p } = f;
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
      .set('u_clouds', p.clouds)
      .set('u_time', f.time)
      .set('u_pxPerRad', f.pxPerRad);
    this.atmos(this.sky, f);
    gl.bindVertexArray(this.skyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.bindVertexArray(this.meshVao);
    this.mesh(this.fill, f);
    this.fill.set('u_fillA', a.fill).set('u_fillB', b.fill);
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
      .set('u_lineA', f.lineA)
      .set('u_lineB', f.lineB)
      .set('u_lineFarA', a.lineFar)
      .set('u_lineFarB', b.lineFar)
      .set('u_rimA', a.rim)
      .set('u_rimB', b.rim)
      .set('u_lsA', [a.farMix, a.lineGain, a.rimAmt, a.packets])
      .set('u_lsB', [b.farMix, b.lineGain, b.rimAmt, b.packets]);
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
