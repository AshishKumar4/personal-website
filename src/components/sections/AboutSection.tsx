import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PERSONAL_INFO } from '@/components/config/constants';
import { api } from '@/lib/api-client';
import { SiteConfig } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';
export function AboutSection() {
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
  return (
    <motion.section
      id="about"
      className="py-24 md:py-32"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="section-heading">
          <span className="font-mono text-green text-xl md:text-2xl mr-3">01.</span> About Me
        </h2>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
          <div className="md:col-span-2 space-y-4 text-light-slate leading-relaxed">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full bg-light-navy" />
                <Skeleton className="h-4 w-full bg-light-navy" />
                <Skeleton className="h-4 w-5/6 bg-light-navy" />
                <Skeleton className="h-4 w-full bg-light-navy mt-4" />
                <Skeleton className="h-4 w-4/6 bg-light-navy" />
              </div>
            ) : (
              <p>{config?.about}</p>
            )}
          </div>
          <div className="relative group w-full max-w-xs mx-auto md:mx-0">
            <div className="absolute -inset-0.5 bg-green rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <div className="relative">
              <div className="absolute inset-0 bg-dark-navy rounded-lg"></div>
              <img
                src={PERSONAL_INFO.profilePicture}
                alt={PERSONAL_INFO.name}
                className="relative w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}