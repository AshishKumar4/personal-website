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
import { NightMasthead } from '@/components/reading/NightMasthead';
import { CHAPTER_PROSE, MONO_LABEL, READING_MEASURE } from '@/components/reading/styles';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const LEDE = '[&>p:first-child]:mb-12 [&>p:first-child]:font-serif [&>p:first-child]:text-[clamp(1.45rem,2.3vw,1.85rem)] [&>p:first-child]:italic [&>p:first-child]:leading-[1.38] [&>p:first-child]:tracking-[-0.01em] [&>p:first-child]:text-foreground';

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
  const location = config?.location || undefined;

  return (
    <>
      <NightMasthead
        seed="about"
        meta={[PERSONAL_INFO.name, location]}
        title="About"
      />
      <Container className="pb-28 md:pb-40">
        <div className="grid grid-cols-1 gap-y-14 md:grid-cols-12 md:gap-x-8">
          <aside className="md:col-span-3">
            <div className="md:sticky md:top-28">
              <figure className="max-w-[12rem] md:max-w-[15rem]">
                <img
                  src={PERSONAL_INFO.profilePicture}
                  alt={`Portrait of ${PERSONAL_INFO.name}`}
                  onError={e => {
                    if (!e.currentTarget.src.endsWith(PERSONAL_INFO.portraitFallback)) e.currentTarget.src = PERSONAL_INFO.portraitFallback;
                  }}
                  className="aspect-[4/5] w-full rounded-[3px] object-cover object-[45%_30%] opacity-90 ring-1 ring-white/10 [filter:saturate(0.85)]"
                />
                <figcaption className={cn(MONO_LABEL, 'mt-3 text-foreground/35')}>{PERSONAL_INFO.name}</figcaption>
              </figure>
              {chapters.length > 0 && (
                <nav className="mt-14 hidden md:block" aria-label="Chapters">
                  <div className={cn(MONO_LABEL, 'mb-5 text-foreground/40')}>Chapters</div>
                  <ol className="space-y-1 border-l border-white/10">
                    {chapters.map((c, i) => (
                      <li key={c.id}>
                        <a
                          href={`#${c.id}`}
                          onClick={e => {
                            e.preventDefault();
                            document.getElementById(c.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className={cn(
                            '-ml-px grid grid-cols-[2.25rem_1fr] border-l py-1.5 pl-4 text-[0.875rem] leading-snug transition-colors duration-300',
                            active === c.id ? 'border-signal text-foreground' : 'border-transparent text-foreground/45 hover:text-foreground',
                          )}
                        >
                          <span className="font-mono text-[0.6875rem] tracking-[0.12em] text-foreground/30 pt-[0.2rem]">{ROMAN[i] ?? i + 1}</span>
                          {c.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
            </div>
          </aside>
          <div ref={bodyRef} className="reading md:col-span-9 lg:col-span-8 lg:col-start-5">
            <div className={cn(READING_MEASURE, 'md:mx-0')}>
              {loading && !config ? (
                <div className="space-y-4">
                  {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-5 w-full bg-white/5" />)}
                </div>
              ) : (
                <MarkdownContent className={cn('chapters', CHAPTER_PROSE, LEDE)}>{story}</MarkdownContent>
              )}
              <div className="mt-24 border-t border-white/10 pt-8">
                <div className={cn(MONO_LABEL, 'text-foreground/35')}>More</div>
                <div className="mt-6 flex flex-wrap gap-x-10 gap-y-4 font-display text-[1.05rem] [font-stretch:112%]">
                  <Link to="/#contact" className="group inline-flex items-center gap-2 text-foreground transition-colors hover:text-signal">
                    Contact <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                  <Link to="/#work" className="group inline-flex items-center gap-2 text-foreground/55 transition-colors hover:text-foreground">
                    Work <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                  <Link to="/blog" className="group inline-flex items-center gap-2 text-foreground/55 transition-colors hover:text-foreground">
                    Blog <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}

export function AboutPage() {
  return (
    <PortfolioLayout variant="reading">
      <Story />
    </PortfolioLayout>
  );
}
