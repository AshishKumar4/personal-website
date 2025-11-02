import React from 'react';
import { motion } from 'framer-motion';
import { PERSONAL_INFO } from '@/components/config/constants';
export function HeroSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const,
      },
    },
  };
  return (
    <section id="hero" className="min-h-screen flex items-center">
      <motion.div
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.p variants={itemVariants} className="text-green font-mono mb-4">
          Hi, my name is
        </motion.p>
        <motion.h1 variants={itemVariants} className="text-4xl sm:text-6xl lg:text-7xl font-bold text-lightest-slate font-display">
          {PERSONAL_INFO.name}.
        </motion.h1>
        <motion.h2 variants={itemVariants} className="text-3xl sm:text-5xl lg:text-6xl font-bold text-slate font-display mt-2">
          I build things for the web.
        </motion.h2>
        <motion.p variants={itemVariants} className="mt-6 max-w-xl text-slate leading-relaxed">
          {PERSONAL_INFO.bio}
        </motion.p>
        <motion.div variants={itemVariants} className="mt-12">
          <a
            href={`mailto:${PERSONAL_INFO.email}`}
            className="inline-block font-mono text-lg border border-green text-green rounded-md px-8 py-4 hover:bg-green-tint transition-colors duration-300"
          >
            Get In Touch
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}