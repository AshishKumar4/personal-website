import type { Variants } from 'framer-motion';

export function createContainerVariants(prefersReducedMotion: boolean): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: prefersReducedMotion ? 0 : 0.3,
      },
    },
  };
}

export function createItemVariants(prefersReducedMotion: boolean): Variants {
  return {
    hidden: { opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.5,
        ease: 'easeOut',
      },
    },
  };
}

export function createFadeInUpVariants(prefersReducedMotion: boolean): Variants {
  return {
    hidden: { opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.6,
      },
    },
  };
}

export function getMotionProps(prefersReducedMotion: boolean) {
  return {
    initial: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: prefersReducedMotion ? 0 : 0.6 },
  };
}

export function getStaggerDelay(index: number, prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : index * 0.1;
}
