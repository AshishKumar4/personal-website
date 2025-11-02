import React from 'react';
import { motion } from 'framer-motion';
import { SOCIAL_LINKS } from '@/components/config/constants';
export function SocialSidebar() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 1.5 }}
      className="hidden md:flex fixed bottom-0 left-10 w-10 flex-col items-center space-y-6 z-10"
    >
      {SOCIAL_LINKS.map(({ name, url, Icon }) => (
        <a
          key={name}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={name}
          className="text-slate hover:text-green transform hover:-translate-y-1 transition-all duration-300"
        >
          <Icon className="w-5 h-5" />
        </a>
      ))}
      <div className="w-px h-24 bg-slate"></div>
    </motion.div>
  );
}