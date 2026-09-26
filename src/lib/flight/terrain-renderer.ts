const NOISE = `
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
float terrain(vec2 xz) {
  float base = fbm(xz * 0.0024 + vec2(5.2, 1.3));
  float ridge = ridged(xz * 0.0052 + vec2(11.3, 4.7));
  float big = snoise(xz * 0.0011 + vec2(3.1, 7.9)) * 0.5 + 0.5;
  float m = smoothstep(0.28, 0.85, base);
  float h = (m * m * 0.75 + ridge * m * 0.45) * mix(150.0, 290.0, big);
  float d = abs(xz.x - pathX(xz.y));
  float carve = smoothstep(10.0, 170.0, d);
  return h * mix(0.2, 1.0, carve);
}
`;

const meshVert = (lit: boolean) => `#version 300 es
precision highp float;
${lit ? '#define LIT 1' : ''}
in vec2 a_grid;
uniform mat4 u_viewProj;
uniform vec3 u_cam;
uniform vec2 u_spacing;
uniform float u_far;
uniform float u_intro;
out float v_alpha;
out float v_light;
out float v_dist;
${NOISE}
void main() {
  vec2 snap = floor(u_cam.xz / u_spacing) * u_spacing;
  vec2 xz = vec2(snap.x + a_grid.x * u_spacing.x, snap.y + u_spacing.y - a_grid.y * u_spacing.y);
  float h = terrain(xz);
  float lambert = 0.0;
#ifdef LIT
  float e = 2.0;
  vec3 n = normalize(vec3(h - terrain(xz + vec2(e, 0.0)), e, h - terrain(xz + vec2(0.0, e))));
  vec3 moon = normalize(vec3(-0.6, 0.5, -0.62));
  lambert = clamp(dot(n, moon), 0.0, 1.0);
#endif
  vec3 world = vec3(xz.x, h, xz.y);
  gl_Position = u_viewProj * vec4(world, 1.0);
  float dist = length(world.xz - u_cam.xz);
  v_dist = dist / u_far;
  float fog = smoothstep(u_far * 0.35, u_far * 0.97, dist);
  float near = smoothstep(10.0, 70.0, dist);
  float reveal = smoothstep(u_intro * u_far, u_intro * u_far - 140.0, dist);
  float snow = smoothstep(110.0, 200.0, h);
  v_light = 0.16 + lambert * (0.85 + snow * 0.8) + snow * 0.25;
  v_alpha = (1.0 - fog) * near * reveal;
}`;

const LINE_FRAG = `#version 300 es
precision highp float;
in float v_alpha;
in float v_light;
in float v_dist;
uniform vec3 u_cool;
uniform vec3 u_warm;
uniform float u_dawn;
out vec4 o;
void main() {
  vec3 col = mix(u_cool, u_warm, clamp(v_dist * 1.4 - 0.1, 0.0, 1.0) * (0.25 + u_dawn * 0.75));
  o = vec4(col * v_light, v_alpha * 0.85);
}`;

const FILL_FRAG = `#version 300 es
precision highp float;
in float v_alpha;
in float v_light;
in float v_dist;
uniform vec3 u_fill;
out vec4 o;
void main() {
  o = vec4(u_fill, 1.0);
}`;

const SKY_VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const SKY_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform float u_horizon;
uniform float u_dawn;
uniform float u_aspect;
uniform vec3 u_top;
uniform vec3 u_mid;
uniform vec3 u_glow;
out vec4 o;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  float y = v_uv.y - u_horizon;
  vec3 col = mix(u_mid, u_top, smoothstep(0.0, 0.55, y));
  float glow = exp(-abs(y) * mix(14.0, 5.0, u_dawn));
  float sunX = 0.34;
  float sun = exp(-length(vec2((v_uv.x - sunX) * u_aspect, y * 2.2)) * mix(6.0, 2.6, u_dawn));
  col += u_glow * (glow * (0.10 + 0.55 * u_dawn) + sun * (0.05 + 0.65 * u_dawn));
  vec2 g = floor(v_uv * vec2(u_aspect, 1.0) * 420.0);
  float s = step(0.9975, hash(g)) * smoothstep(0.08, 0.5, y) * (1.0 - u_dawn * 0.85);
  col += vec3(s * 0.55);
  col += (hash(v_uv * 913.0) - 0.5) * 0.012;
  o = vec4(col, 1.0);
}`;

export interface FlightFrame {
  viewProj: Float32Array;
  cam: [number, number, number];
  horizon: number;
  dawn: number;
  intro: number;
  far: number;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'compile failed');
  return s;
}

function link(gl: WebGL2RenderingContext, vs: string, fs: string, attrib: string): WebGLProgram {
  const p = gl.createProgram()!;
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.bindAttribLocation(p, 0, attrib);
  gl.linkProgram(p);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link failed');
  return p;
}

export class TerrainRenderer {
  private gl: WebGL2RenderingContext;
  private lines!: WebGLProgram;
  private fill!: WebGLProgram;
  private sky!: WebGLProgram;
  private meshVao!: WebGLVertexArrayObject;
  private skyVao!: WebGLVertexArrayObject;
  private triIndices!: WebGLBuffer;
  private lineIndices!: WebGLBuffer;
  private triCount = 0;
  private lineCount = 0;
  private cols = 0;
  private rows = 0;
  private spacing: [number, number];
  private uniforms = new Map<string, WebGLUniformLocation | null>();
  lost = false;

  private constructor(private canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, density: number, private far: number) {
    this.gl = gl;
    this.spacing = [2.6 / density, 6.5 / density];
    this.init();
    canvas.addEventListener('webglcontextlost', this.onLost, false);
    canvas.addEventListener('webglcontextrestored', this.onRestored, false);
  }

  static create(canvas: HTMLCanvasElement, density = 1, far = 1400): TerrainRenderer | null {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: true, depth: true, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) return null;
    try {
      return new TerrainRenderer(canvas, gl, density, far);
    } catch {
      return null;
    }
  }

  private u(program: WebGLProgram, name: string) {
    const key = `${program === this.lines ? 'l' : program === this.fill ? 'f' : 's'}:${name}`;
    if (!this.uniforms.has(key)) this.uniforms.set(key, this.gl.getUniformLocation(program, name));
    return this.uniforms.get(key)!;
  }

  private init() {
    const gl = this.gl;
    this.uniforms.clear();
    this.lines = link(gl, meshVert(true), LINE_FRAG, 'a_grid');
    this.fill = link(gl, meshVert(false), FILL_FRAG, 'a_grid');
    this.sky = link(gl, SKY_VERT, SKY_FRAG, 'a_pos');
    const halfWidth = 900;
    const half = Math.round(halfWidth / this.spacing[0]);
    this.cols = half * 2 + 1;
    this.rows = Math.ceil(this.far / this.spacing[1]) + 2;
    const grid = new Float32Array(this.cols * this.rows * 2);
    let k = 0;
    for (let j = 0; j < this.rows; j++) {
      for (let i = -half; i <= half; i++) {
        grid[k++] = i;
        grid[k++] = j;
      }
    }
    const tris = new Uint32Array((this.cols - 1) * (this.rows - 1) * 6);
    k = 0;
    for (let j = 0; j < this.rows - 1; j++) {
      for (let i = 0; i < this.cols - 1; i++) {
        const a = j * this.cols + i;
        const b = a + 1;
        const c = a + this.cols;
        const d = c + 1;
        tris[k++] = a; tris[k++] = c; tris[k++] = b;
        tris[k++] = b; tris[k++] = c; tris[k++] = d;
      }
    }
    const lines = new Uint32Array(this.rows * (this.cols - 1) * 2);
    k = 0;
    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols - 1; i++) {
        lines[k++] = j * this.cols + i;
        lines[k++] = j * this.cols + i + 1;
      }
    }
    this.triCount = tris.length;
    this.lineCount = lines.length;
    this.meshVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.meshVao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
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
    this.skyVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.skyVao);
    const sb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
  }

  private meshUniforms(p: WebGLProgram, f: FlightFrame) {
    const gl = this.gl;
    gl.uniformMatrix4fv(this.u(p, 'u_viewProj'), false, f.viewProj);
    gl.uniform3f(this.u(p, 'u_cam'), f.cam[0], f.cam[1], f.cam[2]);
    gl.uniform2f(this.u(p, 'u_spacing'), this.spacing[0], this.spacing[1]);
    gl.uniform1f(this.u(p, 'u_far'), f.far);
    gl.uniform1f(this.u(p, 'u_intro'), f.intro);
  }

  render(f: FlightFrame) {
    if (this.lost) return;
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.sky);
    gl.bindVertexArray(this.skyVao);
    gl.uniform1f(this.u(this.sky, 'u_horizon'), f.horizon);
    gl.uniform1f(this.u(this.sky, 'u_dawn'), f.dawn);
    gl.uniform1f(this.u(this.sky, 'u_aspect'), this.canvas.width / this.canvas.height);
    gl.uniform3f(this.u(this.sky, 'u_top'), 0.012, 0.014, 0.024);
    gl.uniform3f(this.u(this.sky, 'u_mid'), 0.035 + f.dawn * 0.06, 0.04 + f.dawn * 0.04, 0.068 + f.dawn * 0.02);
    gl.uniform3f(this.u(this.sky, 'u_glow'), 1.0, 0.56, 0.3);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.bindVertexArray(this.meshVao);
    gl.useProgram(this.fill);
    this.meshUniforms(this.fill, f);
    gl.uniform3f(this.u(this.fill, 'u_fill'), 0.028, 0.031, 0.047);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.5, 2);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triIndices);
    gl.drawElements(gl.TRIANGLES, this.triCount, gl.UNSIGNED_INT, 0);
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.depthMask(false);
    gl.useProgram(this.lines);
    this.meshUniforms(this.lines, f);
    gl.uniform1f(this.u(this.lines, 'u_dawn'), f.dawn);
    gl.uniform3f(this.u(this.lines, 'u_cool'), 0.66, 0.72, 0.86);
    gl.uniform3f(this.u(this.lines, 'u_warm'), 1.0, 0.68, 0.44);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.lineIndices);
    gl.drawElements(gl.LINES, this.lineCount, gl.UNSIGNED_INT, 0);
    gl.depthMask(true);
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
    this.gl.deleteProgram(this.lines);
    this.gl.deleteProgram(this.fill);
    this.gl.deleteProgram(this.sky);
  }
}
