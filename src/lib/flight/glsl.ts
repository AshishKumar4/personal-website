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
uniform vec3 u_shapeA;
uniform vec3 u_shapeB;
uniform vec3 u_front;
uniform vec4 u_rip[4];
float ridged(vec2 p) {
  float sum = 0.0;
  float amp = 0.55;
  float freq = 1.0;
  float prev = 1.0;
  for (int i = 0; i < 5; i++) {
    float n = 1.0 - abs(snoise(p * freq));
    n = n * n;
    sum += n * amp * prev;
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
float terrainBase(vec2 xz) {
  float base = fbm(xz * 0.0024 + vec2(5.2, 1.3));
  float ridge = ridged(xz * 0.0052 + vec2(11.3, 4.7));
  float big = snoise(xz * 0.0011 + vec2(3.1, 7.9)) * 0.5 + 0.5;
  float m = smoothstep(0.28, 0.85, base);
  float h = (m * m * 0.75 + ridge * m * 0.45) * mix(150.0, 290.0, big);
  float d = abs(xz.x - pathX(xz.y));
  float carve = smoothstep(10.0, 170.0, d);
  return h * mix(0.2, 1.0, carve);
}
float terrainH(vec2 xz, vec3 s) {
  float h = terrainBase(xz) * s.x;
  if (s.y > 0.001) {
    float q = h / s.z;
    float t = (floor(q) + smoothstep(0.78, 1.0, fract(q))) * s.z;
    h = mix(h, t, s.y);
  }
  return h;
}
float sweepAt(vec2 xz) {
  float d = length(xz - u_cam.xz);
  return smoothstep(u_front.x - u_front.y, u_front.x + u_front.y, d);
}
vec3 shapeAt(vec2 xz) {
  return mix(u_shapeA, u_shapeB, sweepAt(xz));
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
float groundH(vec2 p) {
  return terrainH(p, shapeAt(p)) + ripple(p).x * 13.0 + seamAt(p) * 9.0;
}
`;
