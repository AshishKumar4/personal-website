import { FULLSCREEN_VERT, Program, fullscreenTriangle } from './gl';

const PREFILTER = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_texel;
uniform float u_threshold;
out vec4 o;
void main() {
  vec3 c = texture(u_tex, v_uv + u_texel * vec2(-1.0, -1.0)).rgb;
  c += texture(u_tex, v_uv + u_texel * vec2(1.0, -1.0)).rgb;
  c += texture(u_tex, v_uv + u_texel * vec2(-1.0, 1.0)).rgb;
  c += texture(u_tex, v_uv + u_texel * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  float k = u_threshold * 0.6;
  float soft = clamp(l - u_threshold + k, 0.0, 2.0 * k);
  soft = soft * soft / (4.0 * k + 1e-4);
  float w = max(soft, l - u_threshold) / max(l, 1e-4);
  o = vec4(c * w, 1.0);
}`;

const DOWN = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_texel;
out vec4 o;
void main() {
  vec2 h = u_texel * 0.5;
  vec3 c = texture(u_tex, v_uv).rgb * 4.0;
  c += texture(u_tex, v_uv - h).rgb;
  c += texture(u_tex, v_uv + h).rgb;
  c += texture(u_tex, v_uv + vec2(h.x, -h.y)).rgb;
  c += texture(u_tex, v_uv - vec2(h.x, -h.y)).rgb;
  o = vec4(c / 8.0, 1.0);
}`;

const UP = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_texel;
uniform float u_weight;
out vec4 o;
void main() {
  vec2 h = u_texel * 0.5;
  vec3 c = texture(u_tex, v_uv + vec2(-h.x * 2.0, 0.0)).rgb;
  c += texture(u_tex, v_uv + vec2(-h.x, h.y)).rgb * 2.0;
  c += texture(u_tex, v_uv + vec2(0.0, h.y * 2.0)).rgb;
  c += texture(u_tex, v_uv + vec2(h.x, h.y)).rgb * 2.0;
  c += texture(u_tex, v_uv + vec2(h.x * 2.0, 0.0)).rgb;
  c += texture(u_tex, v_uv + vec2(h.x, -h.y)).rgb * 2.0;
  c += texture(u_tex, v_uv + vec2(0.0, -h.y * 2.0)).rgb;
  c += texture(u_tex, v_uv + vec2(-h.x, -h.y)).rgb * 2.0;
  o = vec4(c / 12.0 * u_weight, 1.0);
}`;

const COMPOSITE = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform vec2 u_res;
uniform float u_time;
uniform float u_bloomAmt;
uniform float u_warp;
uniform float u_glitch;
uniform float u_scan;
uniform float u_grain;
uniform float u_exposure;
uniform float u_dpr;
uniform vec3 u_rays;
uniform vec3 u_rayColor;
out vec4 o;
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec3 tone(vec3 x) {
  vec3 k = vec3(0.62);
  vec3 over = max(x - k, 0.0);
  return min(x, k) + (1.0 - k) * (1.0 - exp(-over / (1.0 - k)));
}
void main() {
  vec2 uv = v_uv;
  float split = 0.0;
  if (u_glitch > 0.001) {
    float gt = floor(u_time * 7.0);
    float burst = step(0.955, hash(vec2(gt, 3.7)));
    float band = floor(uv.y * mix(14.0, 40.0, hash(vec2(gt, 1.1))));
    float on = step(0.72, hash(vec2(band, gt))) * burst;
    float off = (hash(vec2(band + 5.0, gt)) - 0.5) * 0.035 * on * u_glitch;
    uv.x += off;
    split = abs(off) * 0.6 + on * 0.0015 * u_glitch;
  }
  vec2 dc = uv - 0.5;
  float ca = (0.0006 + u_warp * 0.006) * dot(dc, dc) * 4.0 + split;
  vec3 col;
  col.r = texture(u_scene, uv - dc * ca * 2.0 - vec2(split, 0.0)).r;
  col.g = texture(u_scene, uv).g;
  col.b = texture(u_scene, uv + dc * ca * 2.0 + vec2(split, 0.0)).b;
  vec3 bl = texture(u_bloom, uv).rgb;
  if (u_warp > 0.01) {
    vec3 acc = vec3(0.0);
    float j = hash(gl_FragCoord.xy + u_time);
    for (int i = 0; i < 8; i++) {
      float s = (float(i) + j) / 8.0;
      vec2 q = uv - dc * s * 0.09 * u_warp;
      acc += texture(u_scene, q).rgb + texture(u_bloom, q).rgb * u_bloomAmt;
    }
    float w = u_warp * smoothstep(0.12, 0.5, length(dc));
    col = mix(col, acc / 8.0 - bl * u_bloomAmt, w * 0.85);
  }
  col += bl * u_bloomAmt;
  if (u_rays.z > 0.001) {
    vec2 st = (u_rays.xy - uv) / 28.0;
    vec2 q = uv + st * hash(gl_FragCoord.xy + u_time);
    float acc = 0.0;
    float decay = 1.0;
    for (int i = 0; i < 28; i++) {
      acc += max(dot(texture(u_bloom, q).rgb, vec3(0.3, 0.45, 0.25)) - 0.05, 0.0) * decay;
      decay *= 0.94;
      q += st;
    }
    float fall = 1.0 - smoothstep(0.1, 1.1, length((u_rays.xy - uv) * vec2(u_res.x / u_res.y, 1.0)));
    col += u_rayColor * acc * u_rays.z * 0.05 * fall;
  }
  col = tone(col * u_exposure);
  float v = length(dc * vec2(u_res.x / u_res.y, 1.0) * 0.9);
  col *= mix(1.0, smoothstep(1.05, 0.25, v), 0.55 + u_warp * 0.25);
  if (u_scan > 0.001) {
    float y = gl_FragCoord.y / max(u_dpr, 1.0);
    col *= 1.0 - u_scan * 0.2 * (0.5 + 0.5 * cos(y * 2.0944));
    col *= 1.0 - u_scan * 0.05 * (0.5 + 0.5 * sin(uv.y * 3.0 - u_time * 1.4));
  }
  float n = hash(gl_FragCoord.xy + fract(u_time * 7.13) * vec2(311.0, 173.0)) - 0.5;
  col += n * u_grain * (0.35 + 0.65 * (1.0 - dot(col, vec3(0.33))));
  o = vec4(col, 1.0);
}`;

interface Target {
  fb: WebGLFramebuffer;
  tex: WebGLTexture;
  w: number;
  h: number;
}

export interface PostUniforms {
  time: number;
  bloom: number;
  warp: number;
  glitch: number;
  scan: number;
  grain: number;
  exposure: number;
  dpr: number;
  rays: [number, number, number];
  rayColor: number[];
}

export class Post {
  private prefilter!: Program;
  private down!: Program;
  private up!: Program;
  private composite!: Program;
  private vao!: WebGLVertexArrayObject;
  private msFb: WebGLFramebuffer | null = null;
  private msColor: WebGLRenderbuffer | null = null;
  private msDepth: WebGLRenderbuffer | null = null;
  private scene: Target | null = null;
  private mips: Target[] = [];
  private internal = 0;
  private samples = 0;
  private maxSamples = 0;
  w = 0;
  h = 0;
  bloomOn = true;

  constructor(private gl: WebGL2RenderingContext, bloom: boolean) {
    this.bloomOn = bloom;
    this.init();
  }

  init() {
    const gl = this.gl;
    const float = !!gl.getExtension('EXT_color_buffer_float');
    this.internal = float ? gl.RGBA16F : gl.RGBA8;
    this.maxSamples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) as number);
    this.prefilter = new Program(gl, FULLSCREEN_VERT, PREFILTER);
    this.down = new Program(gl, FULLSCREEN_VERT, DOWN);
    this.up = new Program(gl, FULLSCREEN_VERT, UP);
    this.composite = new Program(gl, FULLSCREEN_VERT, COMPOSITE);
    this.vao = fullscreenTriangle(gl);
    this.w = 0;
    this.h = 0;
  }

  private target(w: number, h: number): Target {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, this.internal, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fb, tex, w, h };
  }

  private free() {
    const gl = this.gl;
    const all = [...this.mips, ...(this.scene ? [this.scene] : [])];
    for (const t of all) {
      gl.deleteFramebuffer(t.fb);
      gl.deleteTexture(t.tex);
    }
    if (this.msFb) gl.deleteFramebuffer(this.msFb);
    if (this.msColor) gl.deleteRenderbuffer(this.msColor);
    if (this.msDepth) gl.deleteRenderbuffer(this.msDepth);
    this.mips = [];
    this.scene = null;
    this.msFb = null;
  }

  resize(w: number, h: number) {
    if (w === this.w && h === this.h && this.scene) return;
    const gl = this.gl;
    this.free();
    this.w = w;
    this.h = h;
    this.samples = Math.min(this.maxSamples, w * h > 2.6e6 ? 2 : 4);
    for (let attempt = 0; attempt < 3; attempt++) {
      this.msColor = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.msColor);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, this.internal, w, h);
      this.msDepth = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.msDepth);
      gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.DEPTH_COMPONENT24, w, h);
      this.msFb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.msFb);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.msColor);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.msDepth);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE || gl.isContextLost()) break;
      this.free();
      if (this.samples > 0) this.samples = 0;
      else this.internal = gl.RGBA8;
    }
    this.scene = this.target(w, h);
    let mw = w;
    let mh = h;
    for (let i = 0; i < 5; i++) {
      mw = Math.max(1, mw >> 1);
      mh = Math.max(1, mh >> 1);
      this.mips.push(this.target(mw, mh));
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  begin() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.msFb);
    gl.viewport(0, 0, this.w, this.h);
  }

  private pass(prog: Program, src: WebGLTexture, srcW: number, srcH: number, dst: Target | null) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fb : null);
    gl.viewport(0, 0, dst ? dst.w : this.w, dst ? dst.h : this.h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src);
    prog.set('u_tex', 0).set('u_texel', [1 / srcW, 1 / srcH]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  finish(u: PostUniforms) {
    const gl = this.gl;
    const scene = this.scene!;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.msFb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, scene.fb);
    gl.blitFramebuffer(0, 0, this.w, this.h, 0, 0, this.w, this.h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.bindVertexArray(this.vao);
    const bloom = this.bloomOn && u.bloom > 0.001;
    if (bloom) {
      const m = this.mips;
      this.prefilter.use().set('u_threshold', this.internal === gl.RGBA8 ? 0.45 : 0.55);
      this.pass(this.prefilter, scene.tex, scene.w, scene.h, m[0]);
      this.down.use();
      for (let i = 1; i < m.length; i++) this.pass(this.down, m[i - 1].tex, m[i - 1].w, m[i - 1].h, m[i]);
      this.up.use().set('u_weight', 1);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      for (let i = m.length - 1; i > 0; i--) this.pass(this.up, m[i].tex, m[i].w, m[i].h, m[i - 1]);
      gl.disable(gl.BLEND);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.w, this.h);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scene.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.mips[0].tex);
    this.composite.use()
      .set('u_scene', 0)
      .set('u_bloom', 1)
      .set('u_res', [this.w, this.h])
      .set('u_time', u.time)
      .set('u_bloomAmt', bloom ? u.bloom : 0)
      .set('u_warp', u.warp)
      .set('u_glitch', u.glitch)
      .set('u_scan', u.scan)
      .set('u_grain', u.grain)
      .set('u_exposure', u.exposure)
      .set('u_dpr', u.dpr)
      .set('u_rays', bloom ? u.rays : [0, 0, 0])
      .set('u_rayColor', u.rayColor);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(null);
  }

  dispose() {
    this.free();
    this.prefilter.dispose();
    this.down.dispose();
    this.up.dispose();
    this.composite.dispose();
  }
}
