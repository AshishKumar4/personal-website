export const MAX_BRUSH = 16;

const VERT = `#version 300 es
in vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D u_x0;
uniform vec2 u_res;
uniform float u_t;
uniform float u_seed;
uniform float u_step;
uniform float u_eta;
uniform float u_cell;
uniform float u_frame;
uniform float u_grain;
uniform vec4 u_brush[${MAX_BRUSH}];
uniform int u_brushCount;
out vec4 o;

uvec3 pcg3d(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v;
}

vec3 rand3(uvec3 k) {
  return vec3(pcg3d(k)) * (1.0 / 4294967296.0);
}

vec3 gauss3(uvec3 k) {
  vec3 u1 = max(rand3(k), vec3(1e-7));
  vec3 u2 = rand3(k ^ uvec3(0x9E3779B9u, 0x85EBCA6Bu, 0xC2B2AE35u));
  return sqrt(-2.0 * log(u1)) * cos(6.2831853 * u2);
}

float alphaBar(float t) {
  const float s = 0.008;
  float c = cos((t + s) / (1.0 + s) * 1.5707963);
  float c0 = cos(s / (1.0 + s) * 1.5707963);
  return max((c * c) / (c0 * c0), 1e-5);
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / u_res;
  float tb = 0.0;
  for (int i = 0; i < ${MAX_BRUSH}; i++) {
    if (i >= u_brushCount) break;
    vec4 b = u_brush[i];
    vec2 d = px - b.xy;
    tb = max(tb, b.z * exp(-dot(d, d) / (b.w * b.w)));
  }
  float t = clamp(u_t + tb * (1.0 - u_t), 0.0, 1.0);
  float ab = alphaBar(t);
  vec3 x0 = texture(u_x0, uv).rgb * 2.0 - 1.0;
  uvec2 cell = uvec2(px / u_cell);
  uint seed = uint(u_seed);
  vec3 epsFixed = gauss3(uvec3(cell, seed));
  float eta = clamp(u_eta + tb, 0.0, 1.0);
  vec3 eps = epsFixed;
  if (eta > 0.001) {
    float k = tb > 0.001 ? u_frame : u_step;
    vec3 epsFresh = gauss3(uvec3(cell, seed + 7919u * uint(k) + 1u));
    eps = sqrt(1.0 - eta * eta) * epsFixed + eta * epsFresh;
  }
  vec3 xt = sqrt(ab) * x0 + sqrt(1.0 - ab) * eps;
  vec3 col = xt * 0.5 + 0.5;
  if (u_grain > 0.0) {
    vec3 g = rand3(uvec3(uvec2(px), uint(u_frame) + seed)) - 0.5;
    col += g * u_grain;
  }
  o = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export interface FieldParams {
  t: number;
  seed: number;
  step: number;
  eta: number;
  cell: number;
  frame: number;
  grain: number;
  brush: Float32Array;
  brushCount: number;
}

type Uniforms = Record<'x0' | 'res' | 't' | 'seed' | 'step' | 'eta' | 'cell' | 'frame' | 'grain' | 'brush' | 'brushCount', WebGLUniformLocation | null>;

export class FieldRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private buffer: WebGLBuffer | null = null;
  private u: Uniforms | null = null;
  private lastSource: TexImageSource | null = null;
  lost = false;

  private constructor(private canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.init();
    canvas.addEventListener('webglcontextlost', this.onLost, false);
    canvas.addEventListener('webglcontextrestored', this.onRestored, false);
  }

  static create(canvas: HTMLCanvasElement): FieldRenderer | null {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
    });
    if (!gl) return null;
    try {
      return new FieldRenderer(canvas, gl);
    } catch {
      return null;
    }
  }

  get rendererName(): string {
    const gl = this.gl;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return String(name || 'WebGL2');
  }

  private compile(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(log || 'shader compile failed');
    }
    return shader;
  }

  private init() {
    const gl = this.gl;
    const vs = this.compile(gl.VERTEX_SHADER, VERT);
    const fs = this.compile(gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, 'a_pos');
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'program link failed');
    }
    this.program = program;
    const loc = (name: string) => gl.getUniformLocation(program, name);
    this.u = {
      x0: loc('u_x0'),
      res: loc('u_res'),
      t: loc('u_t'),
      seed: loc('u_seed'),
      step: loc('u_step'),
      eta: loc('u_eta'),
      cell: loc('u_cell'),
      frame: loc('u_frame'),
      grain: loc('u_grain'),
      brush: loc('u_brush[0]'),
      brushCount: loc('u_brushCount'),
    };
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    if (this.lastSource) this.upload(this.lastSource);
  }

  upload(source: TexImageSource) {
    this.lastSource = source;
    if (this.lost) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  }

  render(p: FieldParams) {
    if (this.lost || !this.program || !this.u) return;
    const gl = this.gl;
    const u = this.u;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(u.x0, 0);
    gl.uniform2f(u.res, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.t, p.t);
    gl.uniform1f(u.seed, p.seed);
    gl.uniform1f(u.step, p.step);
    gl.uniform1f(u.eta, p.eta);
    gl.uniform1f(u.cell, p.cell);
    gl.uniform1f(u.frame, p.frame);
    gl.uniform1f(u.grain, p.grain);
    gl.uniform4fv(u.brush, p.brush);
    gl.uniform1i(u.brushCount, p.brushCount);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private onLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
  };

  private onRestored = () => {
    this.lost = false;
    this.init();
  };

  dispose() {
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored);
    const gl = this.gl;
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.program) gl.deleteProgram(this.program);
    this.lastSource = null;
    this.program = null;
    this.u = null;
  }
}
