import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownContent } from '@/components/MarkdownContent';
import { Container } from '@/components/site/SectionHeader';
import { PERSONAL_INFO } from '@/components/config/constants';
import { cn } from '@/lib/utils';

interface Chapter {
  id: string;
  title: string;
}

function useChapters(ready: boolean) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!ready || !el) return;
    const heads = Array.from(el.querySelectorAll<HTMLHeadingElement>('h2[id]'));
    setChapters(heads.map(h => ({ id: h.id, title: h.textContent ?? '' })));
    const io = new IntersectionObserver(entries => {
      const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setActive(hit.target.id);
    }, { rootMargin: '-20% 0px -65% 0px' });
    heads.forEach(h => io.observe(h));
    return () => io.disconnect();
  }, [ready]);

  return { bodyRef, chapters, active };
}

function Story() {
  const { config, loading } = useSiteConfig();
  const story = config?.aboutStory || config?.about || '';
  const { bodyRef, chapters, active } = useChapters(!!story);

  return (
    <Container className="pb-28 pt-36 md:pb-40 md:pt-48">
      <div className="grid grid-cols-1 gap-y-6 md:grid-cols-12 md:gap-x-8">
        <div className="text-[0.8125rem] text-foreground/50 md:col-span-3">About</div>
        <div className="md:col-span-9">
          <h1 className="font-display text-[clamp(3rem,8vw,7.5rem)] font-[540] leading-[0.92] tracking-[-0.05em] text-foreground">Built to understand.</h1>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-y-12 md:mt-24 md:grid-cols-12 md:gap-x-8">
        <aside className="md:col-span-3">
          <div className="md:sticky md:top-28">
            <img
              src={PERSONAL_INFO.profilePicture}
              alt={`Portrait of ${PERSONAL_INFO.name}`}
              onError={e => {
                if (!e.currentTarget.src.endsWith(PERSONAL_INFO.portraitFallback)) e.currentTarget.src = PERSONAL_INFO.portraitFallback;
              }}
              className="aspect-[4/5] w-full max-w-[18rem] rounded-2xl object-cover object-[45%_30%]"
            />
            {chapters.length > 0 && (
              <nav className="mt-10 hidden md:block" aria-label="Chapters">
                <div className="mb-4 text-[0.8125rem] text-foreground/45">Chapters</div>
                <ol className="space-y-2.5 border-l border-white/10">
                  {chapters.map((c, i) => (
                    <li key={c.id}>
                      <a
                        href={`#${c.id}`}
                        onClick={e => {
                          e.preventDefault();
                          document.getElementById(c.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className={cn(
                          '-ml-px flex gap-3 border-l py-0.5 pl-4 text-sm transition-colors',
                          active === c.id ? 'border-signal text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <span className="tabular text-foreground/30">{String(i + 1).padStart(2, '0')}</span>
                        {c.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </div>
        </aside>
        <div ref={bodyRef} className="reading md:col-span-8 md:col-start-5 lg:col-span-7 lg:col-start-5">
          {loading && !config ? (
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
            </div>
          ) : (
            <MarkdownContent className="chapters story-lead">{story}</MarkdownContent>
          )}
          <div className="mt-16 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-8 text-[0.9375rem]">
            <Link to="/#contact" className="group inline-flex items-center gap-1.5 text-foreground hover:text-signal">
              Say hi <ArrowUpRight size={12} />
            </Link>
            <Link to="/#projects" className="group inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              See the projects <ArrowUpRight size={12} />
            </Link>
            <Link to="/blog" className="group inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
              Read the notes <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </Container>
  );
}

export function AboutPage() {
  return (
    <PortfolioLayout variant="reading">
      <Story />
    </PortfolioLayout>
  );
}
