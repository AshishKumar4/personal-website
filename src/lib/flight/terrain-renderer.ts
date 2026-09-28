import { FULLSCREEN_VERT, Program, fullscreenTriangle } from './gl';
import { NOISE, TERRAIN, setTerrain } from './glsl';
import type { Frame } from './frame';
import { M } from './motifs';

const FIELD_VARYINGS = ['t_pos', 't_mix', 't_look', 't_lit'];

const FIELD_VERT = `#version 300 es
precision highp float;
in vec2 a_pos;
uniform vec2 u_spacing;
uniform vec2 u_jitter;
out vec4 t_pos;
out vec4 t_mix;
out vec4 t_look;
out vec4 t_lit;
${NOISE}
${TERRAIN}
void main() {
  vec2 snap = floor(u_cam.xz / u_spacing) * u_spacing;
  vec2 xz = vec2(snap.x + a_pos.x * u_spacing.x, snap.y + u_spacing.y - a_pos.y * u_spacing.y);
  float row = floor(xz.y / u_spacing.y + 0.5);
  float m = sweepAt(xz);
  float h0 = terrainH(xz, m);
  vec2 rp = ripple(xz);
  float seam = seamAt(xz);
  float h = h0 + rp.x * 13.0 + seam * 9.0;
  if (u_ridge > 0.001) h += ridgeAt(xz);
  float j = mix(u_jitter.x, u_jitter.y, m);
  j = j > 0.001 ? clamp((j - 0.5) * 2.2 + 0.5 + 0.6 * snoise(xz * 0.0035 + 2.7), 0.0, 1.0) * smoothstep(0.0, 0.1, j) : 0.0;
  if (j > 0.001) h += (hash12(vec2(floor(xz.x / u_spacing.x + 0.5), row)) - 0.5) * j * j * 2.5;
  float waveOut = 0.5;
  float wf = motifW(${M.waveform}.0, m);
  if (wf > 0.001) {
    float wave = sin(row * 0.11 + xz.x * 0.004 - u_time * 0.55);
    h += wave * wf * (1.5 + length(xz - u_cam.xz) * 0.004);
    waveOut = mix(0.5, 0.5 + 0.5 * wave, wf);
  }
  vec4 fm = mix(u_formA, u_formB, m);
  vec4 g = mix(u_form2A, u_form2B, m);
  float water = fm.x * (1.0 - smoothstep(0.3, 2.5, h0));
  float cloud = g.x > 0.001 ? g.x * (1.0 - smoothstep(0.0, 9.0, h0 - cloudAtSide(xz, m))) : 0.0;
  if (g.w > 0.001) {
    float bt = bankSide(xz, m);
    cloud = max(cloud, g.w * (1.0 - smoothstep(0.0, 5.0, h0 - bt)) * smoothstep(7.0, 15.0, bt));
  }
  vec3 world = vec3(xz.x, h, xz.y);
  float e = 2.0;
  vec3 n = normalize(vec3(h0 - terrainH(xz + vec2(e, 0.0), m), e, h0 - terrainH(xz + vec2(0.0, e), m)));
  vec3 moon = normalize(vec3(-0.6, 0.5, -0.62));
  float lambert = clamp(dot(n, moon), 0.0, 1.0);
  vec3 v = normalize(u_cam - world);
  float rim = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0) * smoothstep(15.0, 110.0, h0);
  lambert += fm.w * smoothstep(0.93, 0.995, n.y) * smoothstep(40.0, 56.0, h0) * (1.0 - cloud) * 0.5;
  t_pos = vec4(xz, h, h0);
  t_mix = vec4(m, rp.y, seam, j);
  t_look = vec4(waveOut, water, cloud, g.y);
  t_lit = vec4(lambert, rim, row, 0.0);
  gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
  gl_PointSize = 1.0;
}`;

const FIELD_FRAG = `#version 300 es
precision highp float;
out vec4 o;
void main() {
  o = vec4(0.0);
}`;

const meshVert = (lit: boolean, mirror: boolean) => `#version 300 es
precision highp float;
${lit ? '#define LIT 1' : ''}
${mirror ? '#define MIRROR 1' : ''}
layout(location = 0) in vec4 a_pos4;
layout(location = 1) in vec4 a_mix;
layout(location = 2) in vec4 a_look;
layout(location = 3) in vec4 a_lit;
uniform mat4 u_viewProj;
uniform vec3 u_cam;
uniform float u_far;
uniform float u_fog;
uniform float u_intro;
uniform float u_mist;
${VARYINGS('out')}
void main() {
  vec2 xz = a_pos4.xy;
  float h = a_pos4.z;
  float h0 = a_pos4.w;
  float m = a_mix.x;
  v_row = a_lit.z;
  v_grain = a_mix.w;
  v_wave = a_look.x;
  v_water = a_look.y;
  v_cloud = a_look.z;
  v_build = a_look.w;
#ifdef LIT
  float lambert = a_lit.x;
  float rim = a_lit.y;
#else
  float lambert = 0.0;
  float rim = 0.0;
#endif
  vec3 world = vec3(xz.x, h, xz.y);
#ifdef MIRROR
  world.y = -h;
#endif
  gl_Position = u_viewProj * vec4(world, 1.0);
#ifndef MIRROR
  if (v_water > 0.5) gl_Position.z = gl_Position.w * 0.99999;
#endif
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
#ifdef MIRROR
  v_alpha *= smoothstep(0.5, 4.0, h0);
#endif
  v_ring = a_mix.y;
  v_rim = rim;
  v_mix = m;
  v_seam = a_mix.z;
}`;

const VARYINGS = (q: string) => ['vec3 v_world', 'float v_alpha', 'float v_fog', 'float v_light', 'float v_dist', 'float v_ring', 'float v_rim', 'float v_row', 'float v_mix', 'float v_seam', 'float v_mist', 'float v_wave', 'float v_water', 'float v_cloud', 'float v_build', 'float v_grain'].map(v => `${q} ${v};`).join('\n');

const MESH_IN = `
${VARYINGS('in')}
uniform vec4 u_lantern;
uniform vec3 u_lanternColor;
uniform float u_time;
uniform vec3 u_cam;
uniform vec2 u_motif;
uniform float u_mq;
uniform float u_far;
out vec4 o;
float motifW(float id, float m) {
  return (u_motif.x == id ? 1.0 - m : 0.0) + (u_motif.y == id ? m : 0.0);
}
bool motifOn(float id) {
  return u_motif.x == id || u_motif.y == id;
}
vec3 surfaceAt(vec3 w) {
  return w.y < -0.01 ? u_cam + (w - u_cam) * (u_cam.y / (u_cam.y - w.y)) : w;
}
float scanAt(vec2 xz) {
  float ph = fract(u_time / 10.0 + 0.4);
  float lat = u_cam.z - xz.y - mix(40.0, 900.0, ph / 0.65);
  return exp(-lat * lat / 8.0) * (1.0 - smoothstep(0.55, 0.65, ph)) * smoothstep(0.0, 0.08, ph);
}
`;

const lineFrag = (mirror: boolean) => `#version 300 es
precision highp float;
${mirror ? '#define MIRROR 1' : ''}
${NOISE}
${MESH_IN}
uniform vec3 u_lineA;
uniform vec3 u_lineB;
uniform vec3 u_lineFarA;
uniform vec3 u_lineFarB;
uniform vec3 u_rimA;
uniform vec3 u_rimB;
uniform vec4 u_lsA;
uniform vec4 u_lsB;
void main() {
  vec4 ls = mix(u_lsA, u_lsB, v_mix);
  vec3 line = mix(u_lineA, u_lineB, v_mix);
  vec3 col = mix(line, mix(u_lineFarA, u_lineFarB, v_mix), clamp(v_dist * 1.4 - 0.1, 0.0, 1.0) * ls.x) * v_light * ls.y;
  col += mix(u_rimA, u_rimB, v_mix) * v_rim * ls.z;
  col *= 0.85 + 0.3 * v_wave;
  float d = distance(v_world.xz, u_lantern.xy);
  float l = u_lantern.w * (exp(-d * d / 2600.0) * 1.7 + exp(-d / 110.0) * 0.4);
  col += u_lanternColor * l * (0.45 + v_light);
  col += mix(u_lanternColor, vec3(1.0), 0.5) * v_ring * 2.2;
  col += mix(u_lineB, vec3(1.0), 0.35) * v_seam * 1.5;
  if (motifOn(${M.boot}.0)) {
    float w = motifW(${M.boot}.0, v_mix);
    float ph = fract(u_time / 10.0 + 0.2);
    float lvl = mix(-30.0, 320.0, smoothstep(0.0, 0.7, ph));
    float dy = lvl - v_world.y;
    float band = exp(-dy * dy / 40.0);
    float trail = dy > 0.0 ? exp(-dy / 60.0) : 0.0;
    float fade = 1.0 - smoothstep(0.6, 0.85, ph);
    col += vec3(1.0, 0.8, 0.48) * (band * 0.8 + trail * 0.14) * fade * w * (0.35 + v_light * 0.8);
  }
  if (motifOn(${M.dew}.0)) {
    float w = motifW(${M.dew}.0, v_mix);
    float len = 2.5 + v_dist * u_far * 0.008;
    float cx = floor(v_world.x / len);
    float hd = hash12(vec2(cx, v_row * 1.31));
    float catchL = smoothstep(0.45, 1.2, v_light) + v_rim * 1.5;
    if (hd > 0.985 && catchL > 0.01 && v_dist < 0.3) {
      float f = (fract(v_world.x / len) - 0.5) * len;
      float spot = exp(-f * f * 4.0 / (1.0 + v_dist * 40.0));
      float tw = pow(0.5 + 0.5 * sin(u_time * (0.35 + fract(hd * 71.0) * 0.5) + hd * 400.0), 6.0);
      col += vec3(0.94, 0.97, 1.0) * spot * tw * min(catchL, 1.5) * w * 4.0 * (1.0 - smoothstep(0.15, 0.3, v_dist));
    }
  }
  float alpha = v_alpha;
  if (v_grain > 0.001) alpha *= mix(1.0, step(0.5, hash12(vec2(floor(v_world.x / 1.7), v_row * 1.37))) * 1.8, v_grain * 0.9);
  if (v_cloud > 0.001) {
    col = mix(col, line * vec3(0.9, 0.85, 0.8) * 0.5, v_cloud);
    alpha *= 1.0 - v_cloud * 0.72;
  }
#ifdef MIRROR
  col *= vec3(0.9, 0.97, 1.0);
#else
  if (v_water > 0.001) {
    alpha *= 1.0 - v_water * 0.9;
    col += line * scanAt(v_world.xz) * v_water * 1.5;
  }
#endif
  o = vec4(col, alpha * 0.85);
}`;

const ATMOS = `
uniform vec3 u_top;
uniform vec3 u_horizon;
uniform vec3 u_glow;
uniform float u_glowAmt;
uniform float u_band;
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
  col += u_glow * u_band * exp(-el * 70.0) * smoothstep(0.0, 0.006, el) * (0.6 + 0.4 * pow(max(cos(az - u_sunDir.x), 0.0), 2.0));
  if (u_sun > 0.001) {
    float c = max(dot(normalize(vec3(d.x, el, d.z)), sph(u_sunDir.x, u_sunDir.y)), 0.0);
    col += u_glow * (pow(c, 6.0) * 0.12 + pow(c, 70.0) * 0.4) * u_sun;
  }
  return col;
}
`;

const fillFrag = (mirror: boolean) => `#version 300 es
precision highp float;
${mirror ? '#define MIRROR 1' : ''}
${NOISE}
${MESH_IN}
uniform vec3 u_fillA;
uniform vec3 u_fillB;
uniform vec3 u_lineA;
uniform vec3 u_lineB;
uniform float u_moon;
${ATMOS}
vec3 waterAt(vec3 p) {
  vec3 d = normalize(p - u_cam);
  vec3 r = vec3(d.x, max(-d.y, 0.0), d.z);
  vec3 c = atmos(r) * 1.25 + u_horizon * 0.5 * exp(-r.y * 10.0);
  float daz = atan(r.x, -r.z) - 0.42;
  float del = r.y - 0.048;
  c += vec3(0.8, 0.88, 1.0) * u_moon * exp(-daz * daz / 0.00035 - del * del / 0.006) * 0.35;
  return c;
}
void main() {
#ifdef MIRROR
  if (v_water > 0.5) discard;
#endif
  vec3 fogc = atmos(normalize(vec3(v_world.x - u_cam.x, 0.0, v_world.z - u_cam.z)));
  vec3 col = mix(mix(u_fillA, u_fillB, v_mix), fogc, v_fog);
  col = mix(col, fogc * 1.2, v_mist * 0.7);
#ifdef MIRROR
  vec3 sp = surfaceAt(v_world);
  col = mix(col * 0.8, waterAt(sp) * 0.6, 0.3) + mix(u_lineA, u_lineB, v_mix) * scanAt(sp.xz) * 0.05;
#else
  if (v_water > 0.001) {
    vec3 wc = mix(waterAt(v_world), fogc, v_fog * 0.8) + mix(u_lineA, u_lineB, v_mix) * scanAt(v_world.xz) * 0.05;
    col = mix(col, wc, v_water);
  }
#endif
  float d = distance(v_world.xz, u_lantern.xy);
  col += u_lanternColor * u_lantern.w * exp(-d * d / 5000.0) * (0.05 + v_water * 0.04);
  col += u_lanternColor * v_ring * 0.04 * (1.0 + v_water * 2.0);
  if (v_cloud > 0.001) {
    float n = snoise(v_world.xz * 0.0024 + vec2(u_time * 0.004, 1.3)) * 0.5 + 0.5;
    float pocket = smoothstep(0.38, 0.92, n);
    float billow = snoise(v_world.xz * 0.012 + vec2(3.7, u_time * 0.01)) * 0.5 + 0.5;
    vec3 top = mix(vec3(0.048, 0.053, 0.072) * (0.75 + 0.5 * billow) + vec3(0.085, 0.068, 0.085) * motifW(${M.clouds}.0, v_mix), fogc * 1.3, v_fog * 0.85);
    vec3 under = vec3(1.0, 0.45, 0.14) * (0.008 + 0.1 * pocket * pocket) * (1.0 - v_fog * 0.5) * motifW(${M.agents}.0, v_mix);
    col = mix(col, top + under, v_cloud);
  }
  if (v_build > 0.001) {
    vec2 gq = v_world.xz / 24.0;
    vec2 fw = fwidth(gq);
    vec2 gd = abs(fract(gq - 0.5) - 0.5) / max(fw, 1e-4);
    float grid = 1.0 - smoothstep(0.4, 1.4, min(gd.x, gd.y));
    col += mix(u_lineA, u_lineB, v_mix) * grid * (1.0 - smoothstep(0.2, 0.65, v_dist)) * v_build * 0.2;
  }
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
uniform float u_emu;
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
    col += ac * band * rays * breath * u_aurora * 0.55;
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
  if (u_emu > 0.001) {
    vec2 sc = vec2(az, el) - vec2(0.0, 0.135);
    vec2 hs = vec2(0.27, 0.105);
    vec2 dd = abs(sc) - hs + 0.025;
    float r = length(max(dd, 0.0)) + min(max(dd.x, dd.y), 0.0) - 0.025;
    float inside = smoothstep(0.003, -0.012, r);
    float px = r * u_pxPerRad;
    float bezel = exp(-px * px / 2.2);
    float halo = exp(-max(r, 0.0) * 22.0) * (1.0 - inside);
    float raster = 0.72 + 0.28 * sin(el * u_pxPerRad * 1.3);
    float roll = 0.85 + 0.15 * smoothstep(0.7, 1.0, sin(el * 14.0 - u_time * 0.9));
    vec3 ph = vec3(0.6, 0.9, 1.0);
    col += ph * (inside * 0.03 * raster * roll + bezel * 0.09 + halo * 0.018) * u_emu;
    vec2 lp = vec2(hs.x - 0.045, -hs.y + 0.022) + vec2(0.0, 0.135);
    float ld = length((vec2(az, el) - lp) * u_pxPerRad);
    float burst = step(0.45, hash12(vec2(floor(u_time * 0.8), 2.3)));
    float act = step(0.5, hash12(vec2(floor(u_time * 4.0), 1.7))) * burst;
    col += vec3(1.0, 0.56, 0.14) * (exp(-ld * ld / 3.0) * (0.45 + 2.0 * act) + exp(-ld / 9.0) * (0.02 + 0.05 * act)) * u_emu;
  }
  o = vec4(col, 1.0);
}`;

export class TerrainRenderer {
  private field!: Program;
  private lines!: Program;
  private fill!: Program;
  private mirrorLines!: Program;
  private mirrorFill!: Program;
  private sky!: Program;
  private gridVao!: WebGLVertexArrayObject;
  private meshVao!: WebGLVertexArrayObject;
  private skyVao!: WebGLVertexArrayObject;
  private buffers: WebGLBuffer[] = [];
  private fieldBuf!: WebGLBuffer;
  private feedback!: WebGLTransformFeedback;
  private triIndices!: WebGLBuffer;
  private lineIndices!: WebGLBuffer;
  private vertexCount = 0;
  private triCount = 0;
  private lineCount = 0;
  private spacing: [number, number];

  constructor(private gl: WebGL2RenderingContext, density: number, private far: number) {
    this.spacing = [2.6 / density, 6.5 / density];
    this.init();
  }

  get programs(): Program[] {
    return [this.field, this.lines, this.fill, this.mirrorLines, this.mirrorFill, this.sky];
  }

  init() {
    const gl = this.gl;
    this.field = new Program(gl, FIELD_VERT, FIELD_FRAG, FIELD_VARYINGS);
    this.lines = new Program(gl, meshVert(true, false), lineFrag(false));
    this.fill = new Program(gl, meshVert(false, false), fillFrag(false));
    this.mirrorLines = new Program(gl, meshVert(true, true), lineFrag(true));
    this.mirrorFill = new Program(gl, meshVert(false, true), fillFrag(true));
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
    this.vertexCount = cols * rows;
    this.triCount = tris.length;
    this.lineCount = lines.length;
    const gridBuf = gl.createBuffer()!;
    this.gridVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.gridVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuf);
    gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    this.fieldBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fieldBuf);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertexCount * 64, gl.DYNAMIC_COPY);
    this.meshVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.meshVao);
    for (let i = 0; i < 4; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 64, i * 16);
    }
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.feedback = gl.createTransformFeedback()!;
    this.triIndices = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tris, gl.STATIC_DRAW);
    this.lineIndices = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.lineIndices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, lines, gl.STATIC_DRAW);
    this.skyVao = fullscreenTriangle(gl);
    this.buffers = [gridBuf, this.fieldBuf, this.triIndices, this.lineIndices];
  }

  private computeField(f: Frame) {
    const gl = this.gl;
    const { a, b } = f;
    this.field.use().set('u_spacing', this.spacing).set('u_jitter', [a.jitter, b.jitter]);
    setTerrain(this.field, f);
    gl.bindVertexArray(this.gridVao);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, this.feedback);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.fieldBuf);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, this.vertexCount);
    gl.endTransformFeedback();
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    gl.disable(gl.RASTERIZER_DISCARD);
  }

  private mesh(prog: Program, f: Frame) {
    prog.use()
      .set('u_viewProj', f.viewProj)
      .set('u_cam', f.cam)
      .set('u_far', f.far)
      .set('u_fog', f.p.fog)
      .set('u_intro', f.intro)
      .set('u_mist', f.p.mist)
      .set('u_lantern', f.lantern)
      .set('u_lanternColor', f.lanternColor)
      .set('u_time', f.time)
      .set('u_motif', f.motif)
      .set('u_mq', f.mq);
  }

  private atmos(prog: Program, f: Frame) {
    const p = f.p;
    prog
      .set('u_top', p.skyTop)
      .set('u_horizon', p.skyHorizon)
      .set('u_glow', p.glow)
      .set('u_glowAmt', p.glowAmt)
      .set('u_band', p.band)
      .set('u_sun', p.sun)
      .set('u_sunDir', f.sunDir);
  }

  private drawFill(prog: Program, f: Frame, warm: boolean) {
    const gl = this.gl;
    this.mesh(prog, f);
    prog.set('u_fillA', f.a.fill).set('u_fillB', f.b.fill).set('u_lineA', f.lineA).set('u_lineB', f.lineB).set('u_moon', f.p.moon);
    this.atmos(prog, f);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.5, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triIndices);
    gl.drawElements(gl.TRIANGLES, warm ? 6 : this.triCount, gl.UNSIGNED_INT, 0);
    gl.disable(gl.POLYGON_OFFSET_FILL);
  }

  private drawLines(prog: Program, f: Frame, warm: boolean) {
    const gl = this.gl;
    const { a, b } = f;
    this.mesh(prog, f);
    prog
      .set('u_lineA', f.lineA)
      .set('u_lineB', f.lineB)
      .set('u_lineFarA', a.lineFar)
      .set('u_lineFarB', b.lineFar)
      .set('u_rimA', a.rim)
      .set('u_rimB', b.rim)
      .set('u_lsA', [a.farMix, a.lineGain, a.rimAmt, 0])
      .set('u_lsB', [b.farMix, b.lineGain, b.rimAmt, 0]);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.depthMask(false);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.lineIndices);
    gl.drawElements(gl.LINES, warm ? 2 : this.lineCount, gl.UNSIGNED_INT, 0);
  }

  warm(f: Frame) {
    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.bindVertexArray(this.meshVao);
    this.drawFill(this.mirrorFill, f, true);
    this.drawLines(this.mirrorLines, f, true);
    gl.bindVertexArray(null);
  }

  render(f: Frame) {
    const gl = this.gl;
    const { a, b, p } = f;
    this.computeField(f);
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
      .set('u_emu', f.emu)
      .set('u_time', f.time)
      .set('u_pxPerRad', f.pxPerRad);
    this.atmos(this.sky, f);
    gl.bindVertexArray(this.skyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.bindVertexArray(this.meshVao);
    this.drawFill(this.fill, f, false);
    if (Math.max(a.water, b.water) > 0.001) {
      this.drawFill(this.mirrorFill, f, false);
      this.drawLines(this.mirrorLines, f, false);
    }
    this.drawLines(this.lines, f, false);
    gl.bindVertexArray(null);
  }

  dispose() {
    this.programs.forEach(p => p.dispose());
    const gl = this.gl;
    this.buffers.forEach(buf => gl.deleteBuffer(buf));
    gl.deleteTransformFeedback(this.feedback);
    gl.deleteVertexArray(this.gridVao);
    gl.deleteVertexArray(this.meshVao);
    gl.deleteVertexArray(this.skyVao);
  }
}
