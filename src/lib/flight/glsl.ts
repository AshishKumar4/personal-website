export const NOISE = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
vec3 hash31(float p) {
  vec3 p3 = fract(vec3(p) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xxy + p3.yzz) * p3.zyx);
}
`;

export const TERRAIN = `
uniform vec3 u_cam;
uniform float u_time;
uniform vec4 u_shapeA;
uniform vec4 u_shapeB;
uniform vec4 u_formA;
uniform vec4 u_formB;
uniform vec4 u_form2A;
uniform vec4 u_form2B;
uniform vec4 u_varA;
uniform vec4 u_varB;
uniform vec3 u_front;
uniform vec4 u_rip[4];
uniform vec2 u_motif;
uniform float u_mq;
uniform float u_ridge;
float motifW(float id, float m) {
  return (u_motif.x == id ? 1.0 - m : 0.0) + (u_motif.y == id ? m : 0.0);
}
bool motifOn(float id) {
  return u_motif.x == id || u_motif.y == id;
}
float ridged(vec2 p, float e, float det) {
  float sum = 0.0;
  float amp = 0.55;
  float freq = 1.0;
  float prev = 1.0;
  for (int i = 0; i < 5; i++) {
    float n = pow(max(1.0 - abs(snoise(p * freq)), 0.0), e);
    sum += n * amp * prev * clamp(det * 4.0 - float(i) + 1.0, 0.0, 1.0);
    prev = n;
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum;
}
float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amp * snoise(p);
    p = p * 2.01 + vec2(17.3, 9.1);
    amp *= 0.5;
  }
  return sum * 0.5 + 0.5;
}
float pathX(float z) {
  return 38.0 * sin(z * 0.0045) + 16.0 * sin(z * 0.011 + 1.3);
}
float terrainBase(vec2 xz, vec4 v, float det) {
  vec2 q = xz + v.xy;
  float base = fbm(q * 0.0024 + vec2(5.2, 1.3));
  float ridge = ridged(q * 0.0052 + vec2(11.3, 4.7), 2.0 + v.z, det);
  float big = snoise(q * 0.0011 + vec2(3.1, 7.9)) * 0.5 + 0.5;
  float m = smoothstep(0.28, 0.85, base);
  float h = (m * m * 0.75 + ridge * m * 0.45 * (1.0 + v.z * 0.35)) * mix(150.0, 290.0, big);
  float d = abs(xz.x - pathX(xz.y));
  float carve = smoothstep(10.0, 170.0 * (1.0 + v.w), d);
  return h * mix(0.2, 1.0, carve);
}
float baseAt(vec2 xz, float m, float det) {
  if (m <= 0.001 || u_varA == u_varB) return terrainBase(xz, u_varA, det);
  if (m >= 0.999) return terrainBase(xz, u_varB, det);
  return mix(terrainBase(xz, u_varA, det), terrainBase(xz, u_varB, det), m);
}
float hillsH(vec2 q, float d) {
  float n = fbm(q * 0.0016 + vec2(2.3, 8.1));
  return (pow(smoothstep(0.22, 0.86, n), 1.5) * 150.0 + 5.0) * mix(0.3, 1.0, smoothstep(30.0, 280.0, d));
}
float mesaH(vec2 q) {
  vec2 w = q + vec2(snoise(q * 0.006 + 1.3), snoise(q * 0.006 + 7.9)) * 7.0;
  vec2 c = floor(w / 260.0);
  vec2 ctr = (c + 0.5 + (hash22(c + 0.5) - 0.5) * 0.08) * 260.0;
  vec2 k = abs(w - ctr) - (40.0 + hash22(c + 3.3) * 55.0);
  float sd = max(k.x, k.y);
  float on = step(0.42, hash12(c + 7.1)) * step(250.0, abs(ctr.x - pathX(ctr.y)));
  float top = 58.0 + floor(hash12(c + 9.4) * 4.0) * 22.0;
  float h = top * max(1.0 - smoothstep(-2.0, 4.0, sd), (1.0 - smoothstep(2.0, 24.0, sd)) * 0.3) * on;
  return h + fbm(q * 0.006) * 4.0;
}
float cloudTop(vec2 q) {
  return 92.0 + snoise(q * 0.0032 + vec2(4.1, 1.7)) * 16.0 + snoise(q * 0.011 + vec2(9.3, 3.1)) * 5.0;
}
float bankTop(vec2 q) {
  vec2 p = q + vec2(u_time * 1.6, u_time * 0.5);
  float n = smoothstep(0.0, 0.5, snoise(p * 0.0032 + vec2(5.1, 2.3)));
  return 4.0 + n * (30.0 + snoise(p * 0.011 + vec2(1.9, 8.4)) * 8.0);
}
float smax(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (a - b) / k, 0.0, 1.0);
  return mix(b, a, h) + k * h * (1.0 - h);
}
float buildH(vec2 xz, float m, float det, float amp, float rise) {
  vec2 t = floor(xz / 24.0);
  float hb = floor(baseAt((t + 0.5) * 24.0, m, det) * amp / 14.0) * 14.0;
  return hb * smoothstep(0.0, 0.08, rise * 1.2 - hash12(t + 1.7) * 1.05);
}
float sided(float wa, float wb, float va, float vb) {
  return (wa * va + wb * vb) / max(wa + wb, 1e-5);
}
float cloudAtSide(vec2 xz, float m) {
  float wa = u_form2A.x * (1.0 - m);
  float wb = u_form2B.x * m;
  return sided(wa, wb, wa > 0.0 ? cloudTop(xz + u_varA.xy) : 0.0, wb > 0.0 ? cloudTop(xz + u_varB.xy) : 0.0);
}
float bankSide(vec2 xz, float m) {
  float wa = u_form2A.w * (1.0 - m);
  float wb = u_form2B.w * m;
  return sided(wa, wb, wa > 0.0 ? bankTop(xz + u_varA.xy) : 0.0, wb > 0.0 ? bankTop(xz + u_varB.xy) : 0.0);
}
float terrainH(vec2 xz, float m) {
  vec4 s = mix(u_shapeA, u_shapeB, m);
  vec4 fa = u_formA * (1.0 - m);
  vec4 fb = u_formB * m;
  vec4 f = fa + fb;
  vec4 g = mix(u_form2A, u_form2B, m);
  vec2 qa = xz + u_varA.xy;
  vec2 qb = xz + u_varB.xy;
  float d = abs(xz.x - pathX(xz.y));
  float h = f.z + f.w < 0.999 ? baseAt(xz, m, s.w) * s.x : 0.0;
  if (f.z > 0.001) h = mix(h, sided(fa.z, fb.z, fa.z > 0.0 ? hillsH(qa, d) : 0.0, fb.z > 0.0 ? hillsH(qb, d) : 0.0), f.z);
  if (f.w > 0.001) h = mix(h, sided(fa.w, fb.w, fa.w > 0.0 ? mesaH(qa) : 0.0, fb.w > 0.0 ? mesaH(qb) : 0.0), f.w);
  if (f.y > 0.001) h = mix(h, h * smoothstep(220.0, 620.0, d) * 1.2 + fbm((fa.y >= fb.y ? qa : qb) * 0.006) * 4.0, f.y);
  if (f.x > 0.001) h = mix(h, max(h * smoothstep(150.0, 520.0, d) * 1.35 - 14.0, 0.0), f.x);
  if (g.y > 0.001) h = mix(h, buildH(xz, m, s.w, s.x, g.z), g.y);
  if (s.y > 0.001) {
    float qq = h / s.z;
    float t = (floor(qq) + smoothstep(0.78, 1.0, fract(qq))) * s.z;
    h = mix(h, t, s.y);
  }
  if (g.x > 0.001) h = mix(h, smax(h, cloudAtSide(xz, m), 10.0), g.x);
  if (g.w > 0.001) h = mix(h, smax(h, bankSide(xz, m), 6.0), g.w);
  return h;
}
float sweepAt(vec2 xz) {
  float d = length(xz - u_cam.xz);
  return smoothstep(u_front.x - u_front.y, u_front.x + u_front.y, d);
}
float seamAt(vec2 xz) {
  float x = (length(xz - u_cam.xz) - u_front.x) / 30.0;
  return exp(-x * x) * u_front.z;
}
vec2 ripple(vec2 xz) {
  vec2 r = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    vec4 q = u_rip[i];
    if (q.w <= 0.0) continue;
    float d = distance(xz, q.xy);
    float x = (d - q.z * 240.0) / (16.0 + q.z * 22.0);
    float life = (1.0 - smoothstep(0.0, 2.8, q.z)) * q.w;
    float g = exp(-x * x);
    r.x += -x * g * life * 1.7;
    r.y += g * life;
  }
  return r;
}
float groundAt(vec2 p) {
  return terrainH(p, sweepAt(p));
}
float ridgeAt(vec2 xz) {
  float x = (length(xz - u_cam.xz) - u_front.x) / 85.0;
  float dp = (xz.x - pathX(xz.y)) / 160.0;
  return exp(-x * x) * u_ridge * (1.0 - 0.5 * exp(-dp * dp)) * (0.8 + 0.35 * snoise(xz * 0.004 + 5.3));
}
float groundH(vec2 p) {
  float g = groundAt(p) + ripple(p).x * 13.0 + seamAt(p) * 9.0;
  if (u_ridge > 0.001) g += ridgeAt(p);
  return g;
}
`;

type Setter = { set(name: string, v: number | ArrayLike<number>): Setter };

interface TerrainSource {
  cam: number[];
  time: number;
  front: number[];
  ripples: Float32Array;
  varA: number[];
  varB: number[];
  motif: number[];
  mq: number;
  ridge: number;
  a: TerrainForm;
  b: TerrainForm;
}

interface TerrainForm {
  amp: number;
  terrace: number;
  terraceStep: number;
  jitter: number;
  water: number;
  plain: number;
  hills: number;
  mesa: number;
  cloud: number;
  build: number;
  rise: number;
  bank: number;
}

export function setTerrain(prog: Setter, f: TerrainSource) {
  const { a, b } = f;
  prog
    .set('u_cam', f.cam)
    .set('u_time', f.time)
    .set('u_shapeA', [a.amp, a.terrace, a.terraceStep, 1 - a.jitter])
    .set('u_shapeB', [b.amp, b.terrace, b.terraceStep, 1 - b.jitter])
    .set('u_formA', [a.water, a.plain, a.hills, a.mesa])
    .set('u_formB', [b.water, b.plain, b.hills, b.mesa])
    .set('u_form2A', [a.cloud, a.build, a.rise, a.bank])
    .set('u_form2B', [b.cloud, b.build, b.rise, b.bank])
    .set('u_varA', f.varA)
    .set('u_varB', f.varB)
    .set('u_front', f.front)
    .set('u_rip', f.ripples)
    .set('u_motif', f.motif)
    .set('u_mq', f.mq)
    .set('u_ridge', f.ridge);
}
