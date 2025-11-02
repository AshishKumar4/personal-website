import React from 'react';
import { SOCIAL_LINKS } from '@/components/config/constants';
export function Footer() {
  return (
    <footer className="py-8 text-center text-slate">
      <div className="md:hidden flex justify-center space-x-6 mb-4">
        {SOCIAL_LINKS.map(({ name, url, Icon }) => (
          <a
            key={name}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={name}
            className="hover:text-green transition-colors duration-300"
          >
            <Icon className="w-6 h-6" />
          </a>
        ))}
      </div>
      <p className="font-mono text-sm">
        Built with ❤️ at Cloudflare
      </p>
    </footer>
  );
}