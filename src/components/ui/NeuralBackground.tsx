import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  colorIndex: number;
  size: number;
  phase: number;
  connections: number[];
}

interface Signal {
  from: number;
  to: number;
  progress: number;
  speed: number;
  trail: { x: number; y: number }[];
}

export function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { isDark } = useTheme();
  const nodesRef = useRef<Node[]>([]);
  const signalsRef = useRef<Signal[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });
  const rippleWavesRef = useRef<{ x: number; y: number; birthTime: number; speed: number }[]>([]);
  const tempNodesRef = useRef<{ x: number; y: number; createdAt: number; colorIndex: number; willBePermanent: boolean }[]>([]);
  const scrollFadeRef = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const NUM_NODES = 65;
    const CONNECTION_DISTANCE = 180;
    const MAX_CONNECTIONS = 4;

    const colors = isDark
      ? [
          [100, 255, 218],
          [139, 92, 246],
          [99, 102, 241],
          [236, 72, 153],
          [34, 211, 238],
        ]
      : [
          [234, 88, 12],
          [249, 115, 22],
          [251, 146, 60],
          [220, 38, 38],
          [253, 186, 116],
        ];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initNodes();
    };

    const initNodes = () => {
      nodesRef.current = [];
      signalsRef.current = [];

      for (let i = 0; i < NUM_NODES; i++) {
        nodesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          colorIndex: Math.floor(Math.random() * colors.length),
          size: 2 + Math.random() * 1.5,
          phase: Math.random() * Math.PI * 2,
          connections: [],
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { ...mouseRef.current, active: false };
    };

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const fadeStart = windowHeight * 0.3;
      const fadeEnd = windowHeight * 1.2;

      if (scrollY <= fadeStart) {
        scrollFadeRef.current = 1;
      } else if (scrollY >= fadeEnd) {
        scrollFadeRef.current = 0.15;
      } else {
        const progress = (scrollY - fadeStart) / (fadeEnd - fadeStart);
        scrollFadeRef.current = 1 - (progress * 0.85);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const nodes = nodesRef.current;

      rippleWavesRef.current.push({ x, y, birthTime: performance.now(), speed: 350 });

      const nearbyNodes = nodes
        .map((n, idx) => ({ idx, dist: Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2) }))
        .filter((n) => n.dist < 250 && nodes[n.idx].connections.length > 0)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 8);

      nearbyNodes.forEach((nearby, i) => {
        const startNode = nodes[nearby.idx];
        startNode.connections.forEach((endIdx) => {
          setTimeout(() => {
            signalsRef.current.push({
              from: nearby.idx,
              to: endIdx,
              progress: 0,
              speed: 0.015 + Math.random() * 0.01,
              trail: [],
            });
          }, i * 30 + Math.random() * 50);
        });
      });

      const colorIndex = Math.floor(Math.random() * colors.length);
      const willBePermanent = Math.random() < 0.75;
      tempNodesRef.current.push({ x, y, createdAt: performance.now(), colorIndex, willBePermanent });
    };

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll, { passive: true });
    resizeCanvas();
    handleScroll();

    if (prefersReducedMotion) {
      ctx.fillStyle = isDark ? '#0a192f' : '#FAFAFA';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const nodes = nodesRef.current;
      nodes.forEach((n, i) => {
        nodes.forEach((n2, j) => {
          if (i >= j) return;
          const dx = n2.x - n.x;
          const dy = n2.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DISTANCE) {
            const color = colors[n.colorIndex];
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = `rgba(${color.join(',')}, 0.08)`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });

        const color = colors[n.colorIndex];
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.join(',')}, 0.4)`;
        ctx.fill();
      });
      return;
    }

    const updateConnections = () => {
      const nodes = nodesRef.current;
      nodes.forEach((n) => (n.connections = []));

      nodes.forEach((n, i) => {
        const distances: { index: number; dist: number }[] = [];

        nodes.forEach((n2, j) => {
          if (i === j) return;
          const dx = n2.x - n.x;
          const dy = n2.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DISTANCE) {
            distances.push({ index: j, dist });
          }
        });

        distances.sort((a, b) => a.dist - b.dist);
        distances.slice(0, MAX_CONNECTIONS).forEach((d) => {
          if (!n.connections.includes(d.index)) {
            n.connections.push(d.index);
          }
        });
      });
    };

    const spawnSignal = () => {
      const nodes = nodesRef.current;
      const validNodes = nodes.filter((n) => n.connections.length > 0);
      if (validNodes.length === 0) return;

      const startIdx = nodes.indexOf(validNodes[Math.floor(Math.random() * validNodes.length)]);
      const startNode = nodes[startIdx];
      if (startNode.connections.length === 0) return;

      const endIdx = startNode.connections[Math.floor(Math.random() * startNode.connections.length)];

      signalsRef.current.push({
        from: startIdx,
        to: endIdx,
        progress: 0,
        speed: 0.008 + Math.random() * 0.006,
        trail: [],
      });
    };

    let frameCount = 0;
    let time = 0;
    const MOUSE_INFLUENCE_RADIUS = 200;

    const getMouseInfluence = (x: number, y: number, mouse: typeof mouseRef.current) => {
      if (!mouse.active) return 0;
      const dx = mouse.x - x;
      const dy = mouse.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > MOUSE_INFLUENCE_RADIUS) return 0;
      return Math.pow(1 - dist / MOUSE_INFLUENCE_RADIUS, 2);
    };

    const getRippleInfluence = (x: number, y: number, currentTime: number) => {
      const ripples = rippleWavesRef.current;
      let maxInfluence = 0;

      for (const ripple of ripples) {
        const elapsed = (currentTime - ripple.birthTime) / 1000;
        const waveRadius = elapsed * ripple.speed;
        const waveWidth = 100;
        const maxRadius = 500;

        if (waveRadius > maxRadius) continue;

        const dx = x - ripple.x;
        const dy = y - ripple.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const distFromWave = Math.abs(dist - waveRadius);
        if (distFromWave < waveWidth) {
          const waveStrength = 1 - distFromWave / waveWidth;
          const fadeOut = 1 - waveRadius / maxRadius;
          const influence = waveStrength * fadeOut;
          maxInfluence = Math.max(maxInfluence, influence);
        }
      }

      return maxInfluence;
    };

    const draw = () => {
      frameCount++;
      time += 0.016;

      ctx.fillStyle = isDark ? 'rgba(10, 25, 47, 0.05)' : 'rgba(250, 250, 250, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const nodes = nodesRef.current;
      const signals = signalsRef.current;
      const mouse = mouseRef.current;

      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;

        if (mouse.active) {
          const dx = mouse.x - n.x;
          const dy = mouse.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150 && dist > 0) {
            const force = (150 - dist) / 150;
            n.vx += (dx / dist) * force * 0.003;
            n.vy += (dy / dist) * force * 0.003;
          }
        }

        const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (speed > 0.5) {
          n.vx *= 0.97;
          n.vy *= 0.97;
        }
      });

      if (frameCount % 20 === 0) updateConnections();

      if (Math.random() > 0.965) spawnSignal();

      if (mouse.active && Math.random() > 0.92) {
        const nearbyNodes = nodes
          .map((n, idx) => ({ idx, dist: Math.sqrt((n.x - mouse.x) ** 2 + (n.y - mouse.y) ** 2) }))
          .filter((n) => n.dist < MOUSE_INFLUENCE_RADIUS && nodes[n.idx].connections.length > 0)
          .sort((a, b) => a.dist - b.dist);

        if (nearbyNodes.length > 0) {
          const chosen = nearbyNodes[Math.floor(Math.random() * Math.min(3, nearbyNodes.length))];
          const startNode = nodes[chosen.idx];
          const endIdx = startNode.connections[Math.floor(Math.random() * startNode.connections.length)];
          signalsRef.current.push({
            from: chosen.idx,
            to: endIdx,
            progress: 0,
            speed: 0.012 + Math.random() * 0.008,
            trail: [],
          });
        }
      }

      const ripples = rippleWavesRef.current;
      const currentTime = performance.now();
      const scrollFade = scrollFadeRef.current;

      for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        const elapsed = (currentTime - ripple.birthTime) / 1000;
        const waveRadius = elapsed * ripple.speed;
        if (waveRadius > 500) {
          ripples.splice(i, 1);
        }
      }

      const tempNodes = tempNodesRef.current;
      for (let i = tempNodes.length - 1; i >= 0; i--) {
        const tn = tempNodes[i];
        const age = currentTime - tn.createdAt;
        const maxAge = tn.willBePermanent ? 800 : 1500;

        if (age > maxAge) {
          if (tn.willBePermanent) {
            nodesRef.current.push({
              x: tn.x,
              y: tn.y,
              vx: (Math.random() - 0.5) * 0.15,
              vy: (Math.random() - 0.5) * 0.15,
              colorIndex: tn.colorIndex,
              size: 2 + Math.random() * 1.5,
              phase: Math.random() * Math.PI * 2,
              connections: [],
            });
            updateConnections();
          }
          tempNodes.splice(i, 1);
          continue;
        }

        const fadeIn = Math.min(1, age / 150);
        const fadeOut = tn.willBePermanent ? 1 : Math.max(0, 1 - (age - maxAge + 400) / 400);
        const lifeOpacity = (age < maxAge - 400 ? fadeIn : fadeIn * fadeOut) * scrollFade;

        const color = colors[tn.colorIndex];

        nodes.forEach((n) => {
          const dx = n.x - tn.x;
          const dy = n.y - tn.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const connOpacity = lifeOpacity * (1 - dist / 120) * 0.2;
            ctx.beginPath();
            ctx.moveTo(tn.x, tn.y);
            ctx.lineTo(n.x, n.y);
            ctx.strokeStyle = `rgba(${color.join(',')}, ${connOpacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });

        const glowSize = 5 + Math.sin(age * 0.012) * 1.5;
        const glow = ctx.createRadialGradient(tn.x, tn.y, 0, tn.x, tn.y, glowSize);
        glow.addColorStop(0, `rgba(255, 255, 255, ${0.55 * lifeOpacity})`);
        glow.addColorStop(0.25, `rgba(${color.join(',')}, ${0.4 * lifeOpacity})`);
        glow.addColorStop(0.5, `rgba(${color.join(',')}, ${0.15 * lifeOpacity})`);
        glow.addColorStop(0.8, `rgba(${color.join(',')}, ${0.04 * lifeOpacity})`);
        glow.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(tn.x, tn.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
      }

      nodes.forEach((n, i) => {
        n.connections.forEach((j) => {
          if (j <= i) return;
          const n2 = nodes[j];
          const dx = n2.x - n.x;
          const dy = n2.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const midX = (n.x + n2.x) / 2;
          const midY = (n.y + n2.y) / 2;
          const mouseInfluence = Math.max(
            getMouseInfluence(n.x, n.y, mouse),
            getMouseInfluence(n2.x, n2.y, mouse),
            getMouseInfluence(midX, midY, mouse)
          );
          const rippleInfluence = Math.max(
            getRippleInfluence(n.x, n.y, currentTime),
            getRippleInfluence(n2.x, n2.y, currentTime),
            getRippleInfluence(midX, midY, currentTime)
          );
          const totalInfluence = Math.min(1, mouseInfluence + rippleInfluence);

          const baseOpacity = (1 - dist / CONNECTION_DISTANCE) * 0.12;
          const enhancedOpacity = (baseOpacity + totalInfluence * 0.4) * scrollFade;
          const lineWidth = 1 + totalInfluence * 2;

          const color1 = colors[n.colorIndex];
          const color2 = colors[n2.colorIndex];

          const gradient = ctx.createLinearGradient(n.x, n.y, n2.x, n2.y);
          gradient.addColorStop(0, `rgba(${color1.join(',')}, ${enhancedOpacity * 0.5})`);
          gradient.addColorStop(0.5, `rgba(${color1.join(',')}, ${enhancedOpacity})`);
          gradient.addColorStop(1, `rgba(${color2.join(',')}, ${enhancedOpacity * 0.5})`);

          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.strokeStyle = gradient;
          ctx.lineWidth = lineWidth;
          ctx.stroke();

          if (totalInfluence > 0.3 && scrollFade > 0.3) {
            ctx.save();
            ctx.shadowColor = `rgba(${color1.join(',')}, ${totalInfluence * 0.4 * scrollFade})`;
            ctx.shadowBlur = 10 * totalInfluence;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.strokeStyle = `rgba(${color1.join(',')}, ${totalInfluence * 0.25 * scrollFade})`;
            ctx.lineWidth = lineWidth + 2;
            ctx.stroke();
            ctx.restore();
          }
        });
      });

      for (let i = signals.length - 1; i >= 0; i--) {
        const s = signals[i];
        s.progress += s.speed;

        if (s.progress >= 1) {
          const endNode = nodes[s.to];
          if (endNode.connections.length > 0 && Math.random() > 0.4) {
            const candidates = endNode.connections.filter((idx) => idx !== s.from);
            if (candidates.length > 0) {
              const nextIdx = candidates[Math.floor(Math.random() * candidates.length)];
              signals.push({
                from: s.to,
                to: nextIdx,
                progress: 0,
                speed: s.speed * (0.95 + Math.random() * 0.1),
                trail: [],
              });
            }
          }
          signals.splice(i, 1);
          continue;
        }

        const n1 = nodes[s.from];
        const n2 = nodes[s.to];
        const x = n1.x + (n2.x - n1.x) * s.progress;
        const y = n1.y + (n2.y - n1.y) * s.progress;

        s.trail.unshift({ x, y });
        if (s.trail.length > 18) s.trail.pop();

        const signalColor = colors[n1.colorIndex];

        s.trail.forEach((point, idx) => {
          const t = idx / s.trail.length;
          const trailOpacity = (1 - t) * 0.8 * scrollFade;
          const trailSize = (1 - t * 0.7) * 4 + 1;

          const grad = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, trailSize);
          grad.addColorStop(0, `rgba(255, 255, 255, ${trailOpacity * 0.95})`);
          grad.addColorStop(0.2, `rgba(${signalColor.join(',')}, ${trailOpacity * 0.8})`);
          grad.addColorStop(0.5, `rgba(${signalColor.join(',')}, ${trailOpacity * 0.3})`);
          grad.addColorStop(0.8, `rgba(${signalColor.join(',')}, ${trailOpacity * 0.06})`);
          grad.addColorStop(1, 'transparent');

          ctx.beginPath();
          ctx.arc(point.x, point.y, trailSize, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        });
      }

      nodes.forEach((n) => {
        const color = colors[n.colorIndex];
        const mouseInfluence = getMouseInfluence(n.x, n.y, mouse);
        const rippleInfluence = getRippleInfluence(n.x, n.y, currentTime);
        const totalInfluence = Math.min(1, mouseInfluence + rippleInfluence);

        const pulseSpeed = 1.2 + totalInfluence * 3;
        const pulseAmplitude = 0.12 + totalInfluence * 0.2;
        const pulse = Math.sin(time * pulseSpeed + n.phase) * pulseAmplitude + (0.88 + totalInfluence * 0.12);

        const glowMultiplier = (1 + totalInfluence * 2.5) * scrollFade;
        const sizeMultiplier = 1 + totalInfluence * 0.6;

        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size * 2.5 * sizeMultiplier);
        glow.addColorStop(0, `rgba(${color.join(',')}, ${0.2 * pulse * glowMultiplier})`);
        glow.addColorStop(0.25, `rgba(${color.join(',')}, ${0.12 * pulse * glowMultiplier})`);
        glow.addColorStop(0.5, `rgba(${color.join(',')}, ${0.05 * pulse * glowMultiplier})`);
        glow.addColorStop(0.75, `rgba(${color.join(',')}, ${0.015 * pulse * glowMultiplier})`);
        glow.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size * 2.5 * sizeMultiplier, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        if (totalInfluence > 0.2 && scrollFade > 0.3) {
          const outerGlow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size * 5 * sizeMultiplier);
          outerGlow.addColorStop(0, `rgba(${color.join(',')}, ${0.15 * totalInfluence * scrollFade})`);
          outerGlow.addColorStop(0.3, `rgba(${color.join(',')}, ${0.06 * totalInfluence * scrollFade})`);
          outerGlow.addColorStop(0.6, `rgba(${color.join(',')}, ${0.02 * totalInfluence * scrollFade})`);
          outerGlow.addColorStop(1, 'transparent');

          ctx.beginPath();
          ctx.arc(n.x, n.y, n.size * 5 * sizeMultiplier, 0, Math.PI * 2);
          ctx.fillStyle = outerGlow;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size * 0.7 * sizeMultiplier, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.join(',')}, ${(0.55 + totalInfluence * 0.35) * pulse * scrollFade})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size * 0.35 * sizeMultiplier, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.6 + totalInfluence * 0.4) * pulse * scrollFade})`;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [prefersReducedMotion, isDark]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />;
}
