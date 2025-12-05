import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';

export function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { isDark } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = 0;
    const targetFPS = 15;
    const frameInterval = 1000 / targetFPS;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
    const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    const symbols = '+-*/<>[]{}()@#$%&';
    const alphabet = katakana + latin + nums + symbols;

    const fontSize = 14;
    const columnSpacing = 25;
    const columns = Math.floor(canvas.width / columnSpacing);

    interface Drop {
      y: number;
      speed: number;
      opacity: number;
      chars: string[];
      length: number;
    }

    const drops: Drop[] = [];

    for (let x = 0; x < columns; x++) {
      const length = Math.floor(Math.random() * 15) + 5;
      const chars: string[] = [];
      for (let i = 0; i < length; i++) {
        chars.push(alphabet.charAt(Math.floor(Math.random() * alphabet.length)));
      }
      drops[x] = {
        y: Math.random() * canvas.height * -1,
        speed: 0.3 + Math.random() * 0.4,
        opacity: 0.1 + Math.random() * 0.15,
        chars,
        length,
      };
    }

    const textColor = isDark ? [100, 255, 218] : [234, 88, 12];
    const bgFill = isDark ? 'rgba(10, 25, 47, 1)' : 'rgba(250, 250, 250, 1)';
    const bgFade = isDark ? 'rgba(10, 25, 47, 0.15)' : 'rgba(250, 250, 250, 0.15)';

    if (prefersReducedMotion) {
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < columns; i++) {
        if (Math.random() > 0.6) continue;
        const drop = drops[i];
        const x = i * columnSpacing;

        for (let j = 0; j < drop.length; j++) {
          const charY = (j * fontSize) % canvas.height;
          const fadeOpacity = (1 - j / drop.length) * drop.opacity * 0.5;
          ctx.fillStyle = `rgba(${textColor.join(',')}, ${fadeOpacity})`;
          ctx.fillText(drop.chars[j], x, charY);
        }
      }
      return;
    }

    const draw = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(draw);

      const deltaTime = currentTime - lastTime;
      if (deltaTime < frameInterval) return;
      lastTime = currentTime - (deltaTime % frameInterval);

      ctx.fillStyle = bgFade;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const drop = drops[i];
        const x = i * columnSpacing;

        for (let j = 0; j < drop.length; j++) {
          const charY = drop.y - j * fontSize;
          if (charY < -fontSize || charY > canvas.height + fontSize) continue;

          const isHead = j === 0;
          const fadeProgress = j / drop.length;
          let charOpacity = (1 - fadeProgress) * drop.opacity;

          if (isHead) {
            ctx.fillStyle = `rgba(255, 255, 255, ${drop.opacity * 0.8})`;
          } else {
            charOpacity *= 0.7;
            ctx.fillStyle = `rgba(${textColor.join(',')}, ${charOpacity})`;
          }

          ctx.fillText(drop.chars[j], x, charY);

          if (Math.random() > 0.995) {
            drop.chars[j] = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
          }
        }

        drop.y += drop.speed * fontSize;

        if (drop.y - drop.length * fontSize > canvas.height) {
          if (Math.random() > 0.98) {
            drop.y = Math.random() * -500;
            drop.speed = 0.3 + Math.random() * 0.4;
            drop.length = Math.floor(Math.random() * 15) + 5;
            drop.chars = [];
            for (let k = 0; k < drop.length; k++) {
              drop.chars.push(alphabet.charAt(Math.floor(Math.random() * alphabet.length)));
            }
          }
        }
      }
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [prefersReducedMotion, isDark]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />;
}
