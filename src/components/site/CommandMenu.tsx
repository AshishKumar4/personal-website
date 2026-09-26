import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Briefcase, FileText, FolderGit2, Home, Mail, Moon, RotateCcw, Settings, Sun, Terminal, User } from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { useTheme } from '@/hooks/use-theme';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { sampler } from '@/lib/diffusion/sampler-store';
import { openTerminal, scrollToHash } from '@/lib/site-events';
import { PERSONAL_INFO, SOCIAL_LINKS } from '@/components/config/constants';

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { data } = useSiteConfig();

  const run = (fn: () => void) => {
    onOpenChange(false);
    window.setTimeout(fn, 60);
  };

  const section = (hash: string) => () => {
    if (window.location.pathname === '/') scrollToHash(hash);
    else navigate(`/#${hash}`);
  };

  const itemClass = 'gap-3 rounded-none font-mono text-[12px] data-[selected=true]:bg-foreground/[0.06]';

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Where to? Try 'diffusion', 'resample', 'shell'…" className="font-mono text-[13px]" />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty className="py-8 text-center font-mono text-xs text-muted-foreground">No samples matched. Increase guidance?</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem className={itemClass} onSelect={() => run(() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); })}><Home /> Home</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(section('about'))}><User /> Model card</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(section('work'))}><Briefcase /> Training run · experience</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(section('projects'))}><FolderGit2 /> Samples · projects</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(() => navigate('/blog'))}><FileText /> Writing</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(() => navigate('/about'))}><BookOpen /> The longer story</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(section('contact'))}><Mail /> Contact</CommandItem>
        </CommandGroup>
        {data && data.posts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Writing">
              {data.posts.map(p => (
                <CommandItem key={p.slug} value={`post ${p.title}`} className={itemClass} onSelect={() => run(() => navigate(`/blog/${p.slug}`))}>
                  <FileText /> {p.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {data && data.projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {data.projects.map(p => (
                <CommandItem key={p.id} value={`project ${p.name} ${p.repo}`} className={itemClass} onSelect={() => run(() => window.open(p.url || `https://github.com/${p.repo}`, '_blank', 'noopener'))}>
                  <ArrowUpRight /> {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem className={itemClass} onSelect={() => run(() => { if (window.location.pathname !== '/') navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); sampler.command({ type: 'resample' }); })}>
            <RotateCcw /> Resample the hero from noise
          </CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(openTerminal)}><Terminal /> Open shell (aqsh)</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(toggleTheme)}>{isDark ? <Sun /> : <Moon />} Switch to {isDark ? 'paper' : 'ink'} mode</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(() => navigator.clipboard?.writeText(PERSONAL_INFO.email))}><Mail /> Copy email address</CommandItem>
          {SOCIAL_LINKS.map(s => (
            <CommandItem key={s.name} className={itemClass} onSelect={() => run(() => window.open(s.url, '_blank', 'noopener'))}>
              <s.Icon /> {s.name}
            </CommandItem>
          ))}
          <CommandItem className={itemClass} onSelect={() => run(() => navigate('/admin'))}><Settings /> Admin</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
