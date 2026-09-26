type UniformValue = number | ArrayLike<number>;

interface UniformEntry {
  loc: WebGLUniformLocation;
  type: number;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(s) || 'compile failed';
    gl.deleteShader(s);
    throw new Error(log);
  }
  return s;
}

export class Program {
  readonly p: WebGLProgram;
  private map = new Map<string, UniformEntry>();

  constructor(private gl: WebGL2RenderingContext, vs: string, fs: string) {
    const p = gl.createProgram()!;
    const v = compile(gl, gl.VERTEX_SHADER, vs);
    const f = compile(gl, gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.bindAttribLocation(p, 0, 'a_pos');
    gl.linkProgram(p);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(p) || 'link failed');
    this.p = p;
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i);
      if (!info) continue;
      const loc = gl.getUniformLocation(p, info.name);
      if (loc) this.map.set(info.name.replace(/\[0\]$/, ''), { loc, type: info.type });
    }
  }

  use() {
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
