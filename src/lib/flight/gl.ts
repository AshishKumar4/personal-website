type UniformValue = number | ArrayLike<number>;

interface UniformEntry {
  loc: WebGLUniformLocation;
  type: number;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

const COMPLETION_STATUS_KHR = 0x91b1;

export class Program {
  readonly p: WebGLProgram;
  private map = new Map<string, UniformEntry>();
  private shaders: WebGLShader[];
  private done = false;
  private parallel: boolean;

  constructor(private gl: WebGL2RenderingContext, vs: string, fs: string, feedback?: string[]) {
    const p = gl.createProgram()!;
    const v = compile(gl, gl.VERTEX_SHADER, vs);
    const f = compile(gl, gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.bindAttribLocation(p, 0, 'a_pos');
    if (feedback) gl.transformFeedbackVaryings(p, feedback, gl.INTERLEAVED_ATTRIBS);
    gl.linkProgram(p);
    this.p = p;
    this.shaders = [v, f];
    this.parallel = !!gl.getExtension('KHR_parallel_shader_compile');
  }

  ready(): boolean {
    if (this.done || !this.parallel) return true;
    return !!this.gl.getProgramParameter(this.p, COMPLETION_STATUS_KHR) || this.gl.isContextLost();
  }

  finalize() {
    if (this.done) return this;
    const gl = this.gl;
    const p = this.p;
    this.done = true;
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
      const log = this.shaders.map(s => (gl.getShaderParameter(s, gl.COMPILE_STATUS) ? '' : gl.getShaderInfoLog(s) || '')).join('\n').trim();
      this.shaders.forEach(s => gl.deleteShader(s));
      throw new Error(log || gl.getProgramInfoLog(p) || 'link failed');
    }
    this.shaders.forEach(s => {
      gl.detachShader(p, s);
      gl.deleteShader(s);
    });
    this.shaders = [];
    const n = (gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number) || 0;
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      if (!info) continue;
      const loc = gl.getUniformLocation(p, info.name);
      if (loc) this.map.set(info.name.replace(/\[0\]$/, ''), { loc, type: info.type });
    }
    return this;
  }

  use() {
    if (!this.done) this.finalize();
    this.gl.useProgram(this.p);
    return this;
  }

  set(name: string, v: UniformValue) {
    const e = this.map.get(name);
    if (!e) return this;
    const gl = this.gl;
    const a = v as ArrayLike<number>;
    switch (e.type) {
      case gl.FLOAT:
        if (typeof v === 'number') gl.uniform1f(e.loc, v);
        else gl.uniform1fv(e.loc, a as Float32Array);
        break;
      case gl.FLOAT_VEC2: gl.uniform2fv(e.loc, a as Float32Array); break;
      case gl.FLOAT_VEC3: gl.uniform3fv(e.loc, a as Float32Array); break;
      case gl.FLOAT_VEC4: gl.uniform4fv(e.loc, a as Float32Array); break;
      case gl.FLOAT_MAT4: gl.uniformMatrix4fv(e.loc, false, a as Float32Array); break;
      default: gl.uniform1i(e.loc, v as number);
    }
    return this;
  }

  dispose() {
    this.gl.deleteProgram(this.p);
  }
}

export function fullscreenTriangle(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  return vao;
}

export const FULLSCREEN_VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;
