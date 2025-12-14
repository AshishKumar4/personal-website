import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PERSONAL_INFO } from '@/components/config/constants';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

function useTypewriter(text: string, speed: number = 50, delay: number = 800, enabled: boolean = true) {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!enabled || !text) {
      setDisplayText(text);
      return;
    }

    setDisplayText('');
    setIsTyping(true);
    let index = 0;

    const startTimeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (index < text.length) {
          setDisplayText(text.slice(0, index + 1));
          index++;
        } else {
          setIsTyping(false);
          clearInterval(interval);
        }
      }, speed);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [text, speed, delay, enabled]);

  return { displayText, isTyping };
}

export function HeroSection() {
  const { config, loading } = useSiteConfig();
  const prefersReducedMotion = useReducedMotion();
  const subtitle = config?.subtitle || "I build things for the web.";
  const { displayText, isTyping } = useTypewriter(subtitle, 40, 1000, !prefersReducedMotion && !loading);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: prefersReducedMotion ? 0 : 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.5,
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
        <motion.p variants={itemVariants} className="text-primary font-mono mb-4">
          Hi, my name is
        </motion.p>
        <motion.h1 variants={itemVariants} className="text-4xl sm:text-6xl lg:text-7xl font-bold text-foreground font-display">
          {PERSONAL_INFO.name}.
        </motion.h1>
        <motion.div variants={itemVariants} className="mt-2">
          {loading ? (
            <Skeleton className="h-12 w-3/4" />
          ) : (
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-muted-foreground font-display">
              {prefersReducedMotion ? subtitle : displayText}
              {!prefersReducedMotion && (
                <span className={`inline-block w-[3px] h-[0.9em] ml-1 align-middle bg-primary ${isTyping ? 'animate-pulse' : 'animate-blink'}`} />
              )}
            </h2>
          )}
        </motion.div>
        <motion.div variants={itemVariants} className="mt-6 max-w-xl">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : (
            <p className="text-muted-foreground leading-relaxed">
              {config?.bio}
            </p>
          )}
        </motion.div>
        <motion.div variants={itemVariants} className="mt-12">
          <a
            href={`mailto:${PERSONAL_INFO.email}`}
            className="inline-block font-mono text-lg border border-primary text-primary rounded-md px-8 py-4 hover:bg-primary/10 transition-colors duration-300"
          >
            Get In Touch
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
