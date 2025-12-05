import React, { useEffect, useMemo } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';

const NUM_PARTICLES = 400;

const Particle = ({ prefersReducedMotion, isDark }: { prefersReducedMotion: boolean; isDark: boolean }) => {
  const controls = useAnimation();
  const duration = Math.random() * 5 + 5; // 5 to 10 seconds
  const delay = Math.random() * 5;

  // Memoize initial position for static display
  const initialPosition = useMemo(() => ({
    x: Math.random() * 100 + 'vw',
    y: Math.random() * 100 + 'vh',
    opacity: Math.random() * (isDark ? 0.3 : 0.5),
  }), [isDark]);

  useEffect(() => {
    if (prefersReducedMotion) {
      // Static position for reduced motion
      controls.set(initialPosition);
    } else {
      controls.start({
        x: [Math.random() * 100 + 'vw', Math.random() * 100 + 'vw'],
        y: [Math.random() * 100 + 'vh', Math.random() * 100 + 'vh'],
        opacity: [0, Math.random() * (isDark ? 0.3 : 0.5), 0],
        transition: {
          duration,
          delay,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'linear',
        },
      });
    }
  }, [controls, duration, delay, prefersReducedMotion, initialPosition, isDark]);

  // Theme-aware particle color - uses CSS variable
  const particleColor = 'bg-primary';

  return (
    <motion.div
      className={`absolute rounded-full ${particleColor}`}
      style={{
        width: `${Math.random() * 2 + 1}px`,
        height: `${Math.random() * 2 + 1}px`,
      }}
      animate={controls}
    />
  );
};

export function ParticleBackground() {
  const prefersReducedMotion = useReducedMotion();
  const { isDark } = useTheme();

  return (
    <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden">
      {Array.from({ length: NUM_PARTICLES }).map((_, i) => (
        <Particle key={i} prefersReducedMotion={prefersReducedMotion} isDark={isDark} />
      ))}
    </div>
  );
}
