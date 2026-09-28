import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import type { BlogPost, NotebookDoc } from '@shared/types';
import { api } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownContent } from '@/components/MarkdownContent';
import { NotebookRenderer } from '@/components/NotebookRenderer';
import { getReadingTime, paragraphize } from '@/lib/text-utils';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Container } from '@/components/site/SectionHeader';
import { cn } from '@/lib/utils';
import { Horizon, MonoMeta, NightSky } from '@/components/reading/NightMasthead';
import { DISPLAY_TITLE, MONO_LABEL } from '@/components/reading/styles';
import { cleanExcerpt, formatDate, postMinutes, prepareNotebook, splitLead } from '@/components/reading/post-text';
import { scrollToHeading, useArticleNav } from '@/components/reading/useArticleNav';
import { useReaderPrefs } from '@/components/reading/reader-prefs';
import { ReaderDock, TocRail } from '@/components/reading/Toc';
import { EndMatter } from '@/components/reading/EndMatter';
import '@fontsource-variable/mona-sans/wdth-italic.css';
import '@fontsource-variable/literata/opsz.css';
import '@fontsource-variable/literata/opsz-italic.css';

const ColabIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M4.9 6.6a7.6 7.6 0 0 0 0 10.8 7.6 7.6 0 0 0 10 .7l-2.3-2.3a4.3 4.3 0 0 1-5.4-6.6 4.3 4.3 0 0 1 5.4-.5L14.9 6a7.6 7.6 0 0 0-10 .6Zm14.2 0a7.6 7.6 0 0 0-10-.7l2.3 2.3a4.3 4.3 0 0 1 5.4 6.6 4.3 4.3 0 0 1-5.4.5L9.1 18a7.6 7.6 0 0 0 10-.6 7.6 7.6 0 0 0 0-10.8Z" />
  </svg>
);

type Prepared =
  | { kind: 'markdown'; body: string; lead: string | null; words: number }
  | { kind: 'notebook'; doc: NotebookDoc | null; lead: string | null; words: number; colabUrl?: string };

function prepare(post: BlogPost): Prepared {
  if (post.format === 'notebook') {
    const nb = prepareNotebook(post.content, post.title);
    return { kind: 'notebook', doc: nb.doc, lead: nb.lead, words: nb.words, colabUrl: nb.doc?.colabUrl };
  }
  const { lead, rest } = splitLead(paragraphize(post.content));
  return { kind: 'markdown', body: rest, lead, words: post.content.trim().split(/\s+/).length };
}

function onAnchorClick(e: MouseEvent<HTMLElement>) {
  const a = (e.target as HTMLElement).closest('a');
  const href = a?.getAttribute('href');
  if (!href || !href.startsWith('#') || href.length < 2) return;
  const id = decodeURIComponent(href.slice(1));
  if (!document.getElementById(id)) return;
  e.preventDefault();
  scrollToHeading(id);
}

function PostBody() {
  const { slug } = useParams<{ slug: string }>();
  const { data } = useSiteConfig();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const prefs = useReaderPrefs();

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

  const prepared = useMemo(() => (post && post.slug === slug ? prepare(post) : null), [post, slug]);
  const all = useMemo(() => (data?.posts ?? []).slice().sort((a, b) => b.createdAt - a.createdAt), [data]);
  const idx = all.findIndex(p => p.slug === slug);
  const summary = idx >= 0 ? all[idx] : undefined;
  const newer = idx > 0 ? all[idx - 1] : undefined;
  const older = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : undefined;
  const minutes = postMinutes(summary, prepared ? Math.max(1, Math.ceil(prepared.words / 200)) : getReadingTime(''));
  const dek = prepared?.lead ?? (summary ? cleanExcerpt(summary, 220) : null);
  const colabUrl = prepared?.kind === 'notebook' ? prepared.colabUrl : undefined;
  const nav = useArticleNav(bodyRef, prepared, minutes);
  const date = post ? new Date(post.createdAt) : null;
  const ready = !!(post && prepared && date);

  return (
    <>
      <div ref={nav.barRef} className="reading-progress" style={{ transform: 'scaleX(0)' }} aria-hidden="true" />
      <article className="article" data-size={prefs.size} data-theme={prefs.theme} data-font={prefs.font}>
        <header className="article-head relative isolate">
          <NightSky />
          <Container className="pt-24 md:pt-32">
            <div className="article-grid">
              <div className="article-head-col">
                <Link to="/blog" className={cn(MONO_LABEL, 'group inline-flex items-center gap-2 text-foreground/55 transition-colors hover:text-foreground')}>
                  <ArrowLeft size={13} aria-hidden="true" className="transition-transform group-hover:-translate-x-1" /> Blog
                </Link>
                {loading && !ready ? (
                  <div className="mt-12 space-y-5 md:mt-14">
                    <Skeleton className="h-4 w-48 bg-white/5" />
                    <Skeleton className="h-16 w-full bg-white/5" />
                    <Skeleton className="h-16 w-3/4 bg-white/5" />
                  </div>
                ) : ready && date ? (
                  <div className="mt-12 flex flex-col items-start md:mt-14 md:items-center">
                    <MonoMeta
                      className="article-meta text-foreground/60"
                      items={[
                        <time key="d" dateTime={date.toISOString()}>{formatDate(post.createdAt)}</time>,
                        <span key="r" className="tabular">{minutes} min read</span>,
                        prepared?.kind === 'notebook' ? 'Notebook' : null,
                      ]}
                    />
                    <h1 className={cn(DISPLAY_TITLE, 'article-title')}>{post.title}</h1>
                    {dek && <p className={cn('article-dek', dek.length > 240 && 'is-long')}>{dek}</p>}
                    {colabUrl && (
                      <a href={colabUrl} target="_blank" rel="noopener noreferrer" className="article-colab">
                        <span className="text-[#f9ab00]"><ColabIcon /></span>
                        Open in Colab
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="py-24 md:py-32">
                    <div className={cn(MONO_LABEL, 'text-foreground/45')}>{failed ? 'Error 404' : 'Empty'}</div>
                    <p className={cn(DISPLAY_TITLE, 'mt-6 text-[clamp(2.4rem,5vw,4rem)] leading-none')}>{failed ? 'Could not load this post.' : 'Post not found.'}</p>
                    <p className="mt-6 font-serif text-[1.125rem] italic text-foreground/60">{failed ? 'This post does not exist, or it has moved.' : 'This post is empty.'}</p>
                    <Link to="/blog" className={cn(MONO_LABEL, 'mt-10 inline-flex items-center gap-2 text-foreground/70 hover:text-foreground')}>
                      <ArrowLeft size={13} aria-hidden="true" /> All posts
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </Container>
          {ready && post && (
            <div className="mt-10 h-14 md:mt-12 md:h-20">
              <Horizon seed={post.slug} />
            </div>
          )}
        </header>
        {ready && prepared && (
          <div className="article-surface">
            <Container>
              <div className="article-grid article-body-grid">
                <aside className="article-rail">
                  <TocRail items={nav.items} active={nav.active} left={nav.left} prefs={prefs} />
                </aside>
                <div ref={bodyRef} className="article-col" onClick={onAnchorClick}>
                  {prepared.kind === 'notebook' ? (
                    prepared.doc ? <NotebookRenderer doc={prepared.doc} anchors /> : <p className="text-muted-foreground">This notebook could not be rendered.</p>
                  ) : (
                    <MarkdownContent anchors>{prepared.body}</MarkdownContent>
                  )}
                  <EndMatter newer={newer} older={older} colabUrl={colabUrl} />
                </div>
              </div>
            </Container>
          </div>
        )}
      </article>
      {ready && <ReaderDock items={nav.items} active={nav.active} visible={nav.inBody && !nav.done} prefs={prefs} />}
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
