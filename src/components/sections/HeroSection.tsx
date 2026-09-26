import { useEffect, useState } from 'react';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PERSONAL_INFO, SOCIAL_LINKS } from '@/components/config/constants';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { scrollToHash } from '@/lib/site-events';

export function HeroSection() {
  const { config, data } = useSiteConfig();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), 350);
    return () => window.clearTimeout(t);
  }, []);

  const current = data?.experiences?.[0];
  const role = current ? current.role.split(',')[0] : null;
  const headline = config?.now || (current ? `${role} at ${current.company.replace(/\s*\(.*\)$/, '')}.` : '');
  const location = config?.location || current?.location?.split('·')[0].replace(/, United States$/, '').trim() || '';

  return (
    <section id="top" className="relative flex h-[100svh] min-h-[560px] flex-col justify-end" aria-label="Introduction">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-gradient-to-t from-background/95 via-background/55 to-transparent" />
      <div className="relative mx-auto w-full max-w-[1480px] px-5 pb-10 sm:px-8 md:pb-14 lg:px-12">
        <h1
          className={cn(
            'font-display text-[clamp(3.4rem,10.2vw,11.5rem)] font-[560] leading-[0.86] tracking-[-0.055em] text-foreground transition-[opacity,transform,filter] duration-[1600ms] ease-out-expo',
            shown ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-6 opacity-0 blur-md',
          )}
        >
          Ashish Kumar
          <br />
          Singh
        </h1>
        <div
          className={cn(
            'mt-8 grid grid-cols-1 gap-6 border-t border-white/15 pt-6 transition-opacity delay-700 duration-1000 md:mt-12 md:grid-cols-12',
            shown ? 'opacity-100' : 'opacity-0',
          )}
        >
          <p className="max-w-md text-[1.05rem] leading-snug text-foreground/85 md:col-span-5">
            {headline && <span className="text-foreground">{headline} </span>}
            <span className="text-foreground/60">{config?.subtitle}</span>
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[0.95rem] text-foreground/60 md:col-span-4 md:col-start-7">
            {location && <span>{location}</span>}
            {SOCIAL_LINKS.map(s => (
              <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">
                {s.name}
              </a>
            ))}
            <a href={`mailto:${PERSONAL_INFO.email}`} className="transition-colors hover:text-foreground">Email</a>
          </div>
          <div className="hidden justify-end md:col-span-2 md:col-start-11 md:flex">
            <button
              onClick={() => scrollToHash('#about')}
              className="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-foreground/70 transition-colors hover:border-white/50 hover:text-foreground"
              aria-label="Scroll to content"
            >
              <ArrowDown size={16} className="transition-transform duration-500 group-hover:translate-y-0.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
