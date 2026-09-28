import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Briefcase, FileText, Home, Mail, Settings, User } from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { PERSONAL_INFO, SOCIAL_LINKS } from '@/components/config/constants';
import { scrollToSection } from '@/components/site/stage';

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const navigate = useNavigate();
  const { data } = useSiteConfig();

  const run = (fn: () => void) => {
    onOpenChange(false);
    window.setTimeout(fn, 60);
  };

  const section = (hash: string) => () => {
    if (window.location.pathname === '/') scrollToSection(hash);
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
          <CommandItem className={itemClass} onSelect={() => run(section('timeline'))}><Briefcase /> Timeline</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(() => navigate('/blog'))}><FileText /> Blog</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(() => navigate('/about'))}><User /> About</CommandItem>
          <CommandItem className={itemClass} onSelect={() => run(section('contact'))}><Mail /> Contact</CommandItem>
        </CommandGroup>
        {data && data.posts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Posts">
              {data.posts.map(p => (
                <CommandItem key={p.slug} value={`post ${p.title}`} className={itemClass} onSelect={() => run(() => navigate(`/blog/${p.slug}`))}>
                  <FileText /> {p.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {data && data.experiences.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Timeline">
              {data.experiences.map(e => (
                <CommandItem key={e.id} value={`timeline ${e.company} ${e.role}`} className={itemClass} onSelect={() => run(() => (window.location.pathname === '/' ? scrollToSection(e.id) : navigate(`/#t-${e.id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)))}>
                  <Briefcase /> {e.company}
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
