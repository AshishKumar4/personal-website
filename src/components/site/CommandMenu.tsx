import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Briefcase, Crosshair, FileText, FolderGit2, Home, Mail, NotebookPen, Settings } from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { scrollToHash } from '@/lib/site-events';
import { PERSONAL_INFO, SOCIAL_LINKS } from '@/components/config/constants';
import { resolveStory, roman } from '@/components/site/story';
import { scrollToChapter } from '@/components/site/stage';
import { emitFlight } from '@/lib/flight/bus';

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const navigate = useNavigate();
  const { data, config } = useSiteConfig();
  const story = resolveStory(config);

  const run = (fn: () => void) => {
    onOpenChange(false);
    window.setTimeout(fn, 60);
  };

  const section = (hash: string) => () => {
    if (window.location.pathname === '/') scrollToHash(hash);
    else navigate(`/#${hash}`);
  };

  const itemClass = 'gap-3 rounded-md text-[14px] data-[selected=true]:bg-foreground/[0.06]';

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, projects and posts" className="text-[14px]" />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">Nothing found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem className={itemClass} onSelect={() => run(() => { navigate('/'); window.scrollTo({ top: 0, behavior: 'smooth' }); })}><Home /> Home</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(section('work'))}><FolderGit2 /> The work</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(section('experience'))}><Briefcase /> Flight log</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(section('writing'))}><NotebookPen /> Field notes</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(() => navigate('/blog'))}><FileText /> All writing</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(() => navigate('/about'))}><BookOpen /> The longer story</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(section('contact'))}><Mail /> Contact</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="The story">
          {story.map((c, i) => (
            <CommandItem key={c.id || i} value={`chapter ${roman(i)} ${c.title} ${c.era}`} className={itemClass} onSelect={() => run(window.location.pathname === '/' ? () => scrollToChapter(i) : section(c.id))}>
              <span className="w-6 font-mono text-[11px] text-muted-foreground">{roman(i)}</span> {c.title}
            </CommandItem>
          ))}
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
          <CommandItem className={itemClass} onSelect={() => run(() => { if (window.location.pathname === '/') emitFlight('free', true); else navigate('/'); })}><Crosshair /> Take the controls</CommandItem>
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
