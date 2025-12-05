import React from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';

export function AnimatedGridBackground() {
  const prefersReducedMotion = useReducedMotion();
  const { isDark } = useTheme();

  // Theme-aware colors
  const gridColor = isDark ? 'rgba(35, 53, 84, 0.5)' : 'rgba(212, 212, 212, 0.6)';
  const glowColor = isDark
    ? 'rgba(100,255,218,0.08)'
    : 'rgba(234, 88, 12, 0.05)';

  return (
    <div className="fixed inset-0 w-full h-full -z-10">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke={gridColor}
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {prefersReducedMotion ? (
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 50%)`
          }}
        />
      ) : (
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 50%)`
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}
    </div>
  );
}
