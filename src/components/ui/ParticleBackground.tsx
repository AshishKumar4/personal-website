import React, { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
const NUM_PARTICLES = 400;
const Particle = () => {
  const controls = useAnimation();
  const duration = Math.random() * 5 + 5; // 5 to 10 seconds
  const delay = Math.random() * 5;
  useEffect(() => {
    controls.start({
      x: [Math.random() * 100 + 'vw', Math.random() * 100 + 'vw'],
      y: [Math.random() * 100 + 'vh', Math.random() * 100 + 'vh'],
      opacity: [0, Math.random() * 0.3, 0],
      transition: {
        duration,
        delay,
        repeat: Infinity,
        repeatType: 'loop',
        ease: 'linear',
      },
    });
  }, [controls, duration, delay]);
  return (
    <motion.div
      className="absolute rounded-full bg-green"
      style={{
        width: `${Math.random() * 2 + 1}px`,
        height: `${Math.random() * 2 + 1}px`,
      }}
      animate={controls}
    />
  );
};
export function ParticleBackground() {
  return (
    <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden">
      {Array.from({ length: NUM_PARTICLES }).map((_, i) => (
        <Particle key={i} />
      ))}
    </div>
  );
}