import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PERSONAL_INFO } from '@/components/config/constants';
import { api } from '@/lib/api-client';
import { SiteConfig } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';
export function HeroSection() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await api<SiteConfig>('/api/config');
        setConfig(data);
      } catch (error) {
        console.error("Failed to fetch site config:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);
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
        <motion.div variants={itemVariants} className="mt-2">
          {loading ? (
            <Skeleton className="h-12 w-3/4 bg-light-navy" />
          ) : (
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-slate font-display">
              {config?.subtitle || "I build things for the web."}
            </h2>
          )}
        </motion.div>
        <motion.div variants={itemVariants} className="mt-6 max-w-xl">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full bg-light-navy" />
              <Skeleton className="h-4 w-full bg-light-navy" />
              <Skeleton className="h-4 w-5/6 bg-light-navy" />
            </div>
          ) : (
            <p className="text-slate leading-relaxed">
              {config?.bio}
            </p>
          )}
        </motion.div>
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