import { PERSONAL_INFO } from '@/components/config/constants';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { BlogPost } from '@shared/types';
import { api } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownContent } from '@/components/MarkdownContent';
import { NotebookFromJson } from '@/components/NotebookRenderer';
import { getReadingTime } from '@/lib/text-utils';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Container } from '@/components/site/SectionHeader';
import { PostRow } from '@/components/site/PostRow';
import type { NotebookDoc } from '@shared/types';
import { cn } from '@/lib/utils';
import { Horizon, MonoMeta, NightSky } from '@/components/reading/NightMasthead';
import { DISPLAY_TITLE, MONO_LABEL, POST_PROSE, READING_MEASURE } from '@/components/reading/styles';

function notebookColab(content: string): string | undefined {
  try {
    return (JSON.parse(content) as NotebookDoc).colabUrl;
  } catch {
    return undefined;
  }
}

const ColabIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M4.9 6.6a7.6 7.6 0 0 0 0 10.8 7.6 7.6 0 0 0 10 .7l-2.3-2.3a4.3 4.3 0 0 1-5.4-6.6 4.3 4.3 0 0 1 5.4-.5L14.9 6a7.6 7.6 0 0 0-10 .6Zm14.2 0a7.6 7.6 0 0 0-10-.7l2.3 2.3a4.3 4.3 0 0 1 5.4 6.6 4.3 4.3 0 0 1-5.4.5L9.1 18a7.6 7.6 0 0 0 10-.6 7.6 7.6 0 0 0 0-10.8Z" />
  </svg>
);

function ReadingProgress({ target }: { target: RefObject<HTMLElement> }) {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = target.current;
      const bar = barRef.current;
      if (!el || !bar) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      bar.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target]);
  return <div ref={barRef} className="fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-signal" style={{ transform: 'scaleX(0)' }} aria-hidden="true" />;
}

function PostBody() {
  const { slug } = useParams<{ slug: string }>();
  const { data } = useSiteConfig();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setLoading(true);
    setFailed(false);
    api<BlogPost>(`/api/posts/${slug}`)
      .then(p => {
        if (alive) setPost(p);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (post) document.title = `${post.title} · Ashish Kumar Singh`;
    return () => {
      document.title = 'Ashish Kumar Singh';
    };
  }, [post]);

  const isNotebook = post?.format === 'notebook';
  const colabUrl = post && isNotebook ? notebookColab(post.content) : undefined;
  const body = post && !isNotebook ? post.content : '';
  const more = (data?.posts ?? []).filter(p => p.slug !== slug).slice(0, 3);

  const date = post ? new Date(post.createdAt) : null;

  return (
    <>
      <ReadingProgress target={articleRef} />
      <article ref={articleRef} className="reading">
        <header className="relative isolate">
          <NightSky />
          <Container className="pt-28 md:pt-36">
            <div className="mx-auto max-w-5xl">
              <Link to="/blog" className={cn(MONO_LABEL, 'group inline-flex items-center gap-2 text-foreground/50 transition-colors hover:text-foreground')}>
                <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-1" /> All notes
              </Link>
            </div>
            {loading ? (
              <div className="mx-auto mt-16 max-w-5xl space-y-5 md:mt-24">
                <Skeleton className="h-4 w-48 bg-white/5" />
                <Skeleton className="h-20 w-full bg-white/5" />
                <Skeleton className="h-20 w-3/4 bg-white/5" />
              </div>
            ) : post && date ? (
              <div className="mx-auto mt-16 max-w-5xl md:mt-24">
                <MonoMeta
                  items={[
                    <time key="d" dateTime={date.toISOString()}>{date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>,
                    isNotebook ? 'Notebook' : `${getReadingTime(body)} min read`,
                    post.author,
                  ]}
                />
                <h1 className={cn(DISPLAY_TITLE, 'mt-8 text-[clamp(2.4rem,5.4vw,5rem)] leading-[1.02] md:mt-10')}>{post.title}</h1>
                {colabUrl && (
                  <a
                    href={colabUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(MONO_LABEL, 'mt-10 inline-flex items-center gap-2.5 rounded-full border border-white/15 px-4 py-2.5 text-foreground/80 transition-colors hover:border-white/40 hover:text-foreground')}
                  >
                    <span className="text-[#e8710a]"><ColabIcon /></span>
                    Open in Colab
                  </a>
                )}
              </div>
            ) : (
              <div className="mx-auto max-w-3xl py-32 text-center">
                <div className={cn(MONO_LABEL, 'text-foreground/40')}>{failed ? 'Error 404' : 'Empty'}</div>
                <p className={cn(DISPLAY_TITLE, 'mt-6 text-[clamp(2.4rem,5vw,4rem)] leading-none')}>{failed ? 'Could not load this post.' : 'Post not found.'}</p>
                <p className="mt-6 font-serif text-[1.125rem] italic text-foreground/55">{failed ? 'This note does not exist, or it has moved.' : 'This note is empty.'}</p>
              </div>
            )}
          </Container>
          {post && (
            <div className="mt-14 h-20 md:mt-20 md:h-28">
              <Horizon seed={post.slug} />
            </div>
          )}
        </header>
        {post && (
          <Container className="mt-10 md:mt-14">
            <div className="mx-auto max-w-5xl">
              <div className={cn(isNotebook ? 'w-full max-w-[52rem]' : cn(READING_MEASURE, 'mx-0'))}>
                {isNotebook ? <NotebookFromJson json={post.content} /> : <MarkdownContent className={POST_PROSE}>{body}</MarkdownContent>}
                <div className="mt-20 flex items-center justify-between gap-6 border-t border-white/10 pt-8">
                  <span className={cn(MONO_LABEL, 'text-foreground/35')}>{PERSONAL_INFO.name}</span>
                  <Link to="/blog" className={cn(MONO_LABEL, 'group inline-flex items-center gap-2 text-foreground/60 transition-colors hover:text-foreground')}>
                    <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-1" /> All notes
                  </Link>
                </div>
              </div>
            </div>
          </Container>
        )}
      </article>
      {post && more.length > 0 && (
        <Container className="mt-28 pb-24 md:mt-36 md:pb-32">
          <div className={cn(MONO_LABEL, 'mb-4 text-foreground/40')}>More writing</div>
          <ol className="border-b border-white/10">
            {more.map((p, i) => <PostRow key={p.slug} post={p} index={i + 1} />)}
          </ol>
        </Container>
      )}
    </>
  );
}

export function BlogPostPage() {
  return (
    <PortfolioLayout variant="reading">
      <PostBody />
    </PortfolioLayout>
  );
}
