import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { SOCIAL_LINKS } from '@/components/config/constants';
import { scrollToHash } from '@/lib/site-events';

const NAV = [
  { label: 'Work', to: '/#work' },
  { label: 'Experience', to: '/#experience' },
  { label: 'Writing', to: '/blog' },
  { label: 'About', to: '/about' },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const go = (to: string) => (e: React.MouseEvent) => {
    const [path, hash] = to.split('#');
    if (!hash) return;
    e.preventDefault();
    setMenuOpen(false);
    if (location.pathname === (path || '/')) scrollToHash(hash);
    else navigate(`${path || '/'}#${hash}`);
  };

  const linkClass = 'text-[0.875rem] text-foreground/65 transition-colors duration-300 hover:text-foreground';

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500',
          scrolled && !menuOpen ? 'border-b border-white/[0.06] bg-background/60 backdrop-blur-xl' : 'border-b border-transparent',
        )}
      >
        <nav className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-5 sm:px-8 lg:px-12" aria-label="Primary">
          <Link to="/" className="relative z-10 text-[0.9375rem] font-medium tracking-[-0.01em] text-foreground" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Ashish Kumar Singh
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            {NAV.map(item => (
              <Link key={item.label} to={item.to} onClick={go(item.to)} className={linkClass}>
                {item.label}
              </Link>
            ))}
            <Link
              to="/#contact"
              onClick={go('/#contact')}
              className="rounded-full border border-white/15 px-4 py-1.5 text-[0.875rem] text-foreground transition-colors duration-300 hover:border-white/40 hover:bg-white/[0.04]"
            >
              Contact
            </Link>
          </div>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="relative z-10 text-[0.875rem] text-foreground md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </nav>
      </header>
      <div
        id="mobile-menu"
        className={cn(
          'fixed inset-0 z-40 flex flex-col bg-background px-5 pb-10 pt-28 transition-[opacity,visibility] duration-500 md:hidden',
          menuOpen ? 'visible opacity-100' : 'invisible opacity-0',
        )}
      >
        <nav className="flex flex-1 flex-col gap-1" aria-label="Mobile">
          {[{ label: 'Home', to: '/' }, ...NAV, { label: 'Contact', to: '/#contact' }].map(item => (
            <Link key={item.label} to={item.to} onClick={go(item.to)} className="py-2 font-display text-[2.6rem] font-[480] leading-none tracking-[-0.04em] text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex gap-6 text-[0.875rem] text-foreground/60">
          {SOCIAL_LINKS.map(s => (
            <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer">
              {s.name}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
