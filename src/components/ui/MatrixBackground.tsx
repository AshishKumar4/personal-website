import React, { useEffect, useRef } from 'react';
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

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
    const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    const alphabet = katakana + latin + nums;
    const fontSize = 16;
    const columns = Math.floor(canvas.width / fontSize);
    const rainDrops: number[] = [];

    for (let x = 0; x < columns; x++) {
      rainDrops[x] = 1;
    }

    // Theme-aware colors
    const bgColor = isDark ? 'rgba(10, 25, 47, 0.05)' : 'rgba(250, 250, 250, 0.05)';
    const textColor = isDark ? '#64ffda' : '#EA580C';
    const bgFill = isDark ? 'rgba(10, 25, 47, 1)' : 'rgba(250, 250, 250, 1)';

    // For reduced motion: draw a static pattern once
    if (prefersReducedMotion) {
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = textColor;
      ctx.font = `${fontSize}px monospace`;
      ctx.globalAlpha = isDark ? 0.15 : 0.2;

      // Draw static characters scattered across the screen
      for (let i = 0; i < columns; i++) {
        const numChars = Math.floor(Math.random() * 5) + 2;
        for (let j = 0; j < numChars; j++) {
          const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
          const y = Math.floor(Math.random() * (canvas.height / fontSize)) * fontSize;
          ctx.fillText(text, i * fontSize, y);
        }
      }
      ctx.globalAlpha = 1;
      return;
    }

    const draw = () => {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = textColor;
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < rainDrops.length; i++) {
        const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);
        if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          rainDrops[i] = 0;
        }
        rainDrops[i]++;
      }
    };

    const animate = () => {
      draw();
      animationFrameId = window.requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [prefersReducedMotion, isDark]);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />;
}
