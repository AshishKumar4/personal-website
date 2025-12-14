import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { SocialSidebar } from './SocialSidebar';
import { SiteConfigProvider, useSiteConfig } from '@/contexts/SiteConfigContext';
import { AnimatedGridBackground } from '@/components/ui/AnimatedGridBackground';
import { ParticleBackground } from '@/components/ui/ParticleBackground';
import { AuroraBackgroundWrapper } from '@/components/ui/AuroraBackground';
import { MatrixBackground } from '@/components/ui/MatrixBackground';
import { NeuralBackground } from '@/components/ui/NeuralBackground';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Home, User, Briefcase, FolderGit2, Mail, FileText, Settings, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(scrollPercent);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 h-[2px] bg-primary z-[100] transition-[width] duration-150"
      style={{ width: `${progress}%` }}
    />
  );
}

function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); })}>
            <Home className="mr-2 h-4 w-4" />
            Home
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }))}>
            <User className="mr-2 h-4 w-4" />
            About
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' }))}>
            <Briefcase className="mr-2 h-4 w-4" />
            Experience
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' }))}>
            <FolderGit2 className="mr-2 h-4 w-4" />
            Projects
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }))}>
            <Mail className="mr-2 h-4 w-4" />
            Contact
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/blog'))}>
            <FileText className="mr-2 h-4 w-4" />
            Blog
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(toggleTheme)}>
            {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            Toggle {isDark ? 'Light' : 'Dark'} Mode
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/admin'))}>
            <Settings className="mr-2 h-4 w-4" />
            Admin Panel
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

type PortfolioLayoutProps = {
  children: React.ReactNode;
};

function BackgroundRenderer() {
  const { config } = useSiteConfig();

  if (!config) {
    // Default to grid while loading
    return <AnimatedGridBackground />;
  }

  switch (config.backgroundEffect) {
    case 'particles':
      return <ParticleBackground />;
    case 'aurora':
      return <AuroraBackgroundWrapper />;
    case 'matrix':
      return <MatrixBackground />;
    case 'neural':
      return <NeuralBackground />;
    case 'grid':
    default:
      return <AnimatedGridBackground />;
  }
}

export function PortfolioLayout({ children }: PortfolioLayoutProps) {
  return (
    <SiteConfigProvider>
      <ScrollProgress />
      <CommandPalette />
      <div className="flex flex-col min-h-screen">
        <BackgroundRenderer />
        <Header />
        <SocialSidebar />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </div>
    </SiteConfigProvider>
  );
}
