import React from 'react';
import { motion } from 'framer-motion';
export function AnimatedGridBackground() {
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
              stroke="rgba(35, 53, 84, 0.5)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(100,255,218,0.08)_0%,_rgba(100,255,218,0)_50%)]"
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}