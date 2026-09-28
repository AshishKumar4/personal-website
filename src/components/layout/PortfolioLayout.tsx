import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { SiteConfigProvider } from '@/contexts/SiteConfigContext';
import { onOpenCommandMenu } from '@/lib/site-events';
import { scrollToSection } from '@/components/site/stage';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

const CommandMenu = lazy(() => import('@/components/site/CommandMenu'));

type PortfolioLayoutProps = {
  children: React.ReactNode;
  variant?: 'default' | 'reading';
  footer?: boolean;
};

function Overlays() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const off = onOpenCommandMenu(() => {
      setLoaded(true);
      setOpen(true);
    });
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setLoaded(true);
        setOpen(o => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      off();
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return <Suspense fallback={null}>{loaded && <CommandMenu open={open} onOpenChange={setOpen} />}</Suspense>;
}

export function PortfolioLayout({ children, variant = 'default', footer = true }: PortfolioLayoutProps) {
  const location = useLocation();
  const { isDark } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    return () => {
      root.classList.toggle('dark', isDark);
    };
  }, [isDark]);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      let tries = 0;
      let settle = 0;
      const timer = window.setInterval(() => {
        tries++;
        const timeline = document.getElementById('timeline');
        const ready = document.getElementById(id) && (!timeline || timeline.childElementCount > 0);
        if (!ready && tries < 60) return;
        scrollToSection(id, true);
        if (++settle >= 3 || tries >= 60) window.clearInterval(timer);
      }, 90);
      return () => window.clearInterval(timer);
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  return (
    <SiteConfigProvider>
      <div className={cn('relative flex min-h-screen flex-col', variant === 'reading' && 'reading-page')}>
        <a
          href="#main"
          className="sr-only z-[100] rounded bg-foreground px-3 py-2 text-xs text-background focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
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
