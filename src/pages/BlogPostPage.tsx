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
    if (post) document.title = `${post.title} — Ashish Kumar Singh`;
    return () => {
      document.title = 'Ashish Kumar Singh';
    };
  }, [post]);

  const isNotebook = post?.format === 'notebook';
  const colabUrl = post && isNotebook ? notebookColab(post.content) : undefined;
  const body = post && !isNotebook ? post.content : '';
  const more = (data?.posts ?? []).filter(p => p.slug !== slug).slice(0, 3);

  return (
    <>
      <ReadingProgress target={articleRef} />
      <Container className="pt-28 md:pt-36">
        <Link to="/blog" className="group inline-flex items-center gap-2 text-[0.875rem] text-foreground/55 hover:text-foreground">
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-1" /> All notes
        </Link>
      </Container>
      <article ref={articleRef} className="reading">
        <Container className="mt-10 md:mt-14">
          {loading ? (
            <div className="mx-auto max-w-4xl space-y-5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-3/4" />
            </div>
          ) : post ? (
            <header className="mx-auto max-w-5xl">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.875rem] text-foreground/50">
                <time dateTime={new Date(post.createdAt).toISOString()}>
                  {new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </time>
                <span className="text-foreground/25">·</span>
                <span>{isNotebook ? 'Notebook' : `${getReadingTime(body)} min read`}</span>
                <span className="text-foreground/25">·</span>
                <span>{post.author}</span>
              </div>
              <h1 className="mt-6 font-display text-[clamp(2.5rem,5.6vw,5rem)] font-[540] leading-[1] tracking-[-0.045em] text-foreground text-balance">{post.title}</h1>
              {colabUrl && (
                <a
                  href={colabUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[0.875rem] text-foreground transition-colors hover:border-white/40"
                >
                  <span className="text-[#e8710a]"><ColabIcon /></span>
                  Open in Colab
                </a>
              )}
            </header>
          ) : (
            <div className="mx-auto max-w-3xl py-24 text-center">
              <p className="font-display text-5xl font-[500] tracking-[-0.04em] text-foreground">{failed ? 'Post not found' : 'Nothing here'}</p>
            </div>
          )}
        </Container>
        {post && (
          <Container className="mt-14 md:mt-20">
            <div className="mx-auto max-w-[44rem] border-t border-white/10 pt-12">
              {isNotebook ? <NotebookFromJson json={post.content} /> : <MarkdownContent>{body}</MarkdownContent>}
            </div>
          </Container>
        )}
      </article>
      {post && more.length > 0 && (
        <Container className="mt-28 pb-24 md:mt-36 md:pb-32">
          <div className="mb-2 text-[0.8125rem] text-foreground/50">Keep reading</div>
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
