import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { SiteConfigProvider } from '@/contexts/SiteConfigContext';
import { onOpenCommandMenu, onOpenTerminal, scrollToHash } from '@/lib/site-events';
import { greetConsole } from '@/lib/console-greeting';
import { cn } from '@/lib/utils';

const CommandMenu = lazy(() => import('@/components/site/CommandMenu'));
const Terminal = lazy(() => import('@/components/site/Terminal'));

type PortfolioLayoutProps = {
  children: React.ReactNode;
  variant?: 'default' | 'reading';
  footer?: boolean;
};

function Overlays() {
  const [menu, setMenu] = useState(false);
  const [terminal, setTerminal] = useState(false);
  const [menuLoaded, setMenuLoaded] = useState(false);
  const [terminalLoaded, setTerminalLoaded] = useState(false);

  useEffect(() => {
    const openMenu = () => {
      setMenuLoaded(true);
      setMenu(true);
    };
    const openTerm = () => {
      setTerminalLoaded(true);
      setTerminal(true);
    };
    const offMenu = onOpenCommandMenu(openMenu);
    const offTerm = onOpenTerminal(openTerm);
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMenuLoaded(true);
        setMenu(m => !m);
      } else if (!typing && (e.key === '`' || e.key === '~')) {
        e.preventDefault();
        setTerminalLoaded(true);
        setTerminal(t => !t);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      offMenu();
      offTerm();
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <Suspense fallback={null}>
      {menuLoaded && <CommandMenu open={menu} onOpenChange={setMenu} />}
      {terminalLoaded && <Terminal open={terminal} onClose={() => setTerminal(false)} />}
    </Suspense>
  );
}

export function PortfolioLayout({ children, variant = 'default', footer = true }: PortfolioLayoutProps) {
  const location = useLocation();

  useEffect(() => {
    greetConsole();
  }, []);

  useEffect(() => {
    if (location.hash) {
      const hash = location.hash;
      const timer = window.setTimeout(() => scrollToHash(hash), 120);
      return () => window.clearTimeout(timer);
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  return (
    <SiteConfigProvider>
      <div className={cn('grain relative flex min-h-screen flex-col', variant === 'reading' && 'reading-page')}>
        <a
          href="#main"
          className="sr-only z-[100] rounded bg-foreground px-3 py-2 font-mono text-xs text-background focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="relative flex-grow">
          {children}
        </main>
        {footer && <Footer />}
      </div>
      <Overlays />
    </SiteConfigProvider>
  );
}
