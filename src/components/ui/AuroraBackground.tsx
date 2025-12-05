import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';

interface AuroraWave {
  y: number;
  amplitude: number;
  wavelength: number;
  speed: number;
  phase: number;
  color: number[];
  opacity: number;
}

export function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const colors = isDark
      ? [
          [99, 102, 241],
          [139, 92, 246],
          [168, 85, 247],
          [192, 132, 252],
          [129, 140, 248],
        ]
      : [
          [234, 88, 12],
          [249, 115, 22],
          [251, 146, 60],
          [253, 186, 116],
          [234, 88, 12],
        ];

    const waves: AuroraWave[] = [];
    const numWaves = 5;

    for (let i = 0; i < numWaves; i++) {
      waves.push({
        y: canvas.height * (0.2 + i * 0.15),
        amplitude: 30 + Math.random() * 50,
        wavelength: 200 + Math.random() * 300,
        speed: 0.0005 + Math.random() * 0.001,
        phase: Math.random() * Math.PI * 2,
        color: colors[i % colors.length],
        opacity: 0.15 + Math.random() * 0.15,
      });
    }

    if (prefersReducedMotion) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      waves.forEach((wave) => {
        const gradient = ctx.createLinearGradient(0, wave.y - 100, 0, wave.y + 150);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, `rgba(${wave.color.join(',')}, ${wave.opacity})`);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);

        for (let x = 0; x <= canvas.width; x += 5) {
          const y = wave.y + Math.sin(x / wave.wavelength + wave.phase) * wave.amplitude;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        ctx.fill();
      });
      return;
    }

    let time = 0;

    const draw = () => {
      time += 16;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      waves.forEach((wave, index) => {
        const timeOffset = time * wave.speed;
        const breathe = Math.sin(time * 0.0003 + index) * 0.3 + 1;

        const gradient = ctx.createLinearGradient(
          0,
          wave.y - 100 * breathe,
          0,
          wave.y + 200 * breathe
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.3, `rgba(${wave.color.join(',')}, ${wave.opacity * 0.5 * breathe})`);
        gradient.addColorStop(0.5, `rgba(${wave.color.join(',')}, ${wave.opacity * breathe})`);
        gradient.addColorStop(0.7, `rgba(${wave.color.join(',')}, ${wave.opacity * 0.5 * breathe})`);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);

        for (let x = 0; x <= canvas.width; x += 3) {
          const waveY =
            wave.y +
            Math.sin((x / wave.wavelength) + timeOffset + wave.phase) * wave.amplitude * breathe +
            Math.sin((x / (wave.wavelength * 0.5)) + timeOffset * 1.5) * (wave.amplitude * 0.3) +
            Math.sin((x / (wave.wavelength * 2)) + timeOffset * 0.5) * (wave.amplitude * 0.5);
          ctx.lineTo(x, waveY);
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        ctx.fill();

        const shimmerX = (time * 0.05 + index * 200) % (canvas.width + 400) - 200;
        const shimmerGradient = ctx.createRadialGradient(
          shimmerX,
          wave.y,
          0,
          shimmerX,
          wave.y,
          150
        );
        shimmerGradient.addColorStop(0, `rgba(255, 255, 255, ${0.1 * breathe})`);
        shimmerGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = shimmerGradient;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [prefersReducedMotion, isDark]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />;
}

export const AuroraBackgroundWrapper = AuroraBackground;
