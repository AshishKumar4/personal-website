import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, Command, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import { SECTIONS, SOCIAL_LINKS } from '@/components/config/constants';
import { ScrambleText } from '@/components/diffusion/ScrambleText';
import { openCommandMenu, scrollToHash } from '@/lib/site-events';
import { sampler } from '@/lib/diffusion/sampler-store';

const NAV = [
  { label: 'Work', to: '/#work' },
  { label: 'Projects', to: '/#projects' },
  { label: 'Writing', to: '/blog' },
  { label: 'About', to: '/about' },
];

function useActiveSection(enabled: boolean): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) {
      setActive(null);
      return;
    }
    const els = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    const io = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActive(visible[0].target.id);
      else if (window.scrollY < window.innerHeight * 0.5) setActive(null);
    }, { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.01] });
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [enabled]);
  return active;
}

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const onHome = location.pathname === '/';
  const active = useActiveSection(onHome);
  const activeSection = SECTIONS.find(s => s.id === active);
  const activeIndex = activeSection ? SECTIONS.indexOf(activeSection) + 1 : 0;
  const [heroReady, setHeroReady] = useState(() => !onHome || sampler.get().phase === 'done');

  useEffect(() => {
    if (!onHome) {
      setHeroReady(true);
      return;
    }
    return sampler.subscribe(s => {
      if (s.phase === 'done' || (s.phase === 'sampling' && s.t < 0.45)) setHeroReady(true);
    });
  }, [onHome]);

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
    if (hash) {
      e.preventDefault();
      setMenuOpen(false);
      if (location.pathname === (path || '/')) scrollToHash(hash);
      else navigate(`${path || '/'}#${hash}`);
    }
  };

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter,opacity] duration-700',
          scrolled && !menuOpen ? 'border-b border-line/10 bg-background/70 backdrop-blur-xl' : 'border-b border-transparent',
          heroReady ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <nav className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:px-12" aria-label="Primary">
          <Link to="/" className="group relative z-10 flex items-baseline gap-3" aria-label="Ashish Kumar Singh, home">
            <span className="font-display text-[1.6rem] leading-none tracking-[-0.02em] text-foreground">
              Ashish<span className="text-signal">.</span>
            </span>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:inline">
              {activeSection ? (
                <ScrambleText key={activeSection.id} text={`§${String(activeIndex).padStart(2, '0')} ${activeSection.label}`} trigger="mount" duration={500} />
              ) : (
                'signal from noise'
              )}
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV.map(item => (
              <Link
                key={item.label}
                to={item.to}
                onClick={go(item.to)}
                className="link-underline font-mono text-[11px] uppercase tracking-[0.14em] text-foreground/80 transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <div className="flex items-center gap-1 border-l border-line/15 pl-5">
              <button
                onClick={openCommandMenu}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line/15 px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-line/40 hover:text-foreground"
                aria-label="Open command menu"
              >
                <Command size={11} /> K
              </button>
              <button
                onClick={toggleTheme}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                aria-label={isDark ? 'Switch to paper mode' : 'Switch to ink mode'}
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
            <Link
              to="/#contact"
              onClick={go('/#contact')}
              className="group inline-flex h-9 items-center gap-2 rounded-full bg-foreground px-4 font-mono text-[11px] uppercase tracking-[0.12em] text-background transition-colors hover:bg-signal"
            >
              Say hi
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          <div className="relative z-10 flex items-center gap-1 md:hidden">
            <button
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 items-center justify-center text-muted-foreground"
              aria-label={isDark ? 'Switch to paper mode' : 'Switch to ink mode'}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="inline-flex h-10 items-center gap-2 px-2 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? <><X size={15} /> Close</> : 'Menu'}
            </button>
          </div>
        </nav>
      </header>

      <div
        id="mobile-menu"
        className={cn(
          'fixed inset-0 z-40 flex flex-col bg-background px-5 pb-10 pt-24 transition-[opacity,visibility] duration-500 md:hidden',
          menuOpen ? 'visible opacity-100' : 'invisible opacity-0',
        )}
      >
        <nav className="flex flex-1 flex-col justify-center gap-2" aria-label="Mobile">
          {[{ label: 'Home', to: '/' }, ...NAV, { label: 'Contact', to: '/#contact' }].map((item, i) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={go(item.to)}
              className="group flex items-baseline gap-4 border-b border-line/10 py-3"
              style={{ transitionDelay: menuOpen ? `${i * 40}ms` : '0ms' }}
            >
              <span className="font-mono text-[11px] text-muted-foreground">{String(i).padStart(2, '0')}</span>
              <span className="font-display text-5xl leading-none tracking-[-0.02em] text-foreground">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {SOCIAL_LINKS.map(s => (
            <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              {s.name}
            </a>
          ))}
          <button onClick={() => { setMenuOpen(false); openCommandMenu(); }} className="hover:text-foreground">⌘K</button>
        </div>
      </div>
    </>
  );
}
