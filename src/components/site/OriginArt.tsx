import React, { useMemo } from 'react';
import { network, orbitalCloud } from '@/components/site/origins';

const at = (v: number, len?: number) => ({ '--at': v, ...(len ? { '--len': len } : {}) }) as React.CSSProperties;

export function LabArt() {
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return [388 + Math.cos(a) * 34, 96 + Math.sin(a) * 34] as const;
  });
  const inner = [0, 2, 4].map(i => {
    const [x1, y1] = hex[i];
    const [x2, y2] = hex[(i + 1) % 6];
    const k = 0.24;
    return { x1: x1 + (388 - x1) * k, y1: y1 + (96 - y1) * k, x2: x2 + (388 - x2) * k, y2: y2 + (96 - y2) * k };
  });
  return (
    <svg viewBox="0 0 480 400" role="img" aria-label="A flask, test tubes and a benzene ring, drawn in line">
      <path className="og-d" style={at(0.05, 0.3)} pathLength={1} d="M40 336 H452" />
      <path className="og-fill og-f" style={at(0.42)} d="M121 262 C146 254 166 270 185 262 C204 254 226 270 249 262 L274 318 Q280 332 264 332 H106 Q90 332 96 318 Z" />
      <path className="og-d" style={at(0.1, 0.4)} pathLength={1} d="M164 58 H206 M172 58 V150 L96 318 Q90 332 106 332 H264 Q280 332 274 318 L198 150 V58" />
      <path className="og-d og-wave" style={at(0.4, 0.2)} pathLength={1} d="M121 262 C146 254 166 270 185 262 C204 254 226 270 249 262" />
      <g className="og-f" style={at(0.55)}>
        {[
          [150, 312, 4, 0],
          [178, 300, 3, 1.1],
          [206, 318, 5, 0.5],
          [226, 306, 3, 1.7],
          [192, 322, 2.5, 2.3],
        ].map(([cx, cy, r, d], i) => (
          <circle key={i} className="og-bubble" cx={cx} cy={cy} r={r} style={{ animationDelay: `${d}s` }} />
        ))}
      </g>
      {[330, 368, 406].map((x, i) => (
        <g key={x}>
          <path className="og-fill og-f" style={at(0.5 + i * 0.05)} d={`M${x + 1} ${250 - i * 22} H${x + 21} V290 A10 10 0 0 1 ${x + 1} 290 Z`} />
          <path className="og-d" style={at(0.2 + i * 0.06, 0.25)} pathLength={1} d={`M${x} 176 V290 A11 11 0 0 0 ${x + 22} 290 V176`} />
        </g>
      ))}
      <path className="og-d" style={at(0.34, 0.2)} pathLength={1} d="M316 214 H442 M324 214 V336 M434 214 V336" />
      <polygon className="og-d" style={at(0.46, 0.25)} pathLength={1} points={hex.map(p => p.join(',')).join(' ')} />
      {inner.map((l, i) => (
        <line key={i} className="og-d" style={at(0.6 + i * 0.04, 0.12)} pathLength={1} {...l} />
      ))}
    </svg>
  );
}

export function QuantumArt() {
  const cloud = useMemo(() => orbitalCloud(420, 240, 168, 118), []);
  return (
    <svg viewBox="0 0 480 400" role="img" aria-label="The Rutherford atom dissolving into a quantum orbital, with Schrödinger's equation">
      <g className="og-out" style={at(0.5)}>
        {[0, 60, 120].map((r, i) => (
          <g key={r} transform={`rotate(${r} 240 168)`}>
            <ellipse className="og-d" style={at(0.05 + i * 0.07, 0.3)} pathLength={1} cx={240} cy={168} rx={150} ry={46} />
            <circle className="og-f" style={at(0.3)} r={4} fill="currentColor">
              <animateMotion dur={`${3.6 + i * 0.7}s`} begin={`${-i * 1.3}s`} repeatCount="indefinite" path="M390 168 A150 46 0 1 1 90 168 A150 46 0 1 1 390 168" />
            </circle>
          </g>
        ))}
        <text x={240} y={318} className="og-cap" textAnchor="middle">RUTHERFORD · 1911</text>
      </g>
      <g className="og-f" style={at(0.52, 0.3)}>
        {cloud.map((d, i) => (
          <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={d.r.toFixed(2)} fill="currentColor" opacity={d.o.toFixed(2)} />
        ))}
        <text x={240} y={318} className="og-cap" textAnchor="middle">SCHRÖDINGER · 1926</text>
      </g>
      <circle cx={240} cy={168} r={5} fill="currentColor" className="og-f" style={at(0.1)} />
      <g className="og-f" style={at(0.62)}>
        <text x={240} y={372} className="og-eq" textAnchor="middle">
          iħ ∂ψ/∂t = Ĥψ
        </text>
      </g>
      <path className="og-d" style={at(0.66, 0.2)} pathLength={1} d="M150 386 H330" />
    </svg>
  );
}

const BOOT = [
  { t: '$ ./hlds_run -game cstrike +map de_dust2', dim: false },
  { t: '  32 slots · server online', dim: true },
  { t: '', dim: true },
  { t: 'aqeous x86 · booting', dim: false },
  { t: '  smp: 4 cpus online', dim: true },
  { t: '  fs: root mounted', dim: true },
  { t: '  gui: compositor ready', dim: true },
];

export function MachineArt() {
  return (
    <svg viewBox="0 0 480 400" role="img" aria-label="A monitor showing a game server starting and an operating system booting">
      <rect className="og-d" style={at(0.02, 0.3)} pathLength={1} x={36} y={26} width={408} height={276} rx={18} />
      <rect className="og-d og-screen" style={at(0.12, 0.25)} pathLength={1} x={56} y={46} width={368} height={236} rx={8} />
      <path className="og-d" style={at(0.2, 0.2)} pathLength={1} d="M204 302 L194 348 H286 L276 302 M156 350 H324" />
      <g className="og-crosshair og-f" style={at(0.34)}>
        <circle className="og-d" style={at(0.34, 0.15)} pathLength={1} cx={384} cy={236} r={17} />
        <path className="og-d" style={at(0.4, 0.12)} pathLength={1} d="M384 210 V224 M384 248 V262 M358 236 H372 M396 236 H410" />
      </g>
      {BOOT.map((l, i) => (
        <text key={i} x={76} y={82 + i * 26} className={l.dim ? 'og-mono og-dim og-f' : 'og-mono og-f'} style={at(0.3 + i * 0.07)}>
          {l.t}
        </text>
      ))}
      <rect className="og-cursor og-f" style={at(0.8)} x={76} y={82 + BOOT.length * 26 - 13} width={9} height={15} />
    </svg>
  );
}

export function MindArt() {
  const net = useMemo(() => network([4, 6, 6, 3], 480, 380, 56), []);
  return (
    <svg viewBox="0 0 480 380" role="img" aria-label="A small neural network with signals moving through it">
      {net.edges.map(([a, b], i) => (
        <line key={i} className="og-d og-edge" style={at(0.08 + a.layer * 0.16 + (i % 7) * 0.01, 0.22)} pathLength={1} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      ))}
      <g className="og-f" style={at(0.72)}>
        {net.pulses.map(({ edge: [a, b], delay }, i) => (
          <line key={i} className="og-pulse" pathLength={1} x1={a.x} y1={a.y} x2={b.x} y2={b.y} style={{ animationDelay: `${delay}s` }} />
        ))}
      </g>
      {net.nodes.map((n, i) => (
        <circle key={i} className={n.layer === 3 ? 'og-node og-node-out og-f' : 'og-node og-f'} style={at(0.04 + n.layer * 0.16)} cx={n.x} cy={n.y} r={n.layer === 3 ? 8 : 6.5} />
      ))}
    </svg>
  );
}
