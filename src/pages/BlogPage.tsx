import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/site/SectionHeader';
import { PostRow } from '@/components/site/PostRow';
import { ResolveText } from '@/components/diffusion/ResolveText';
import { ScrambleText } from '@/components/diffusion/ScrambleText';
import type { PostSummary } from '@shared/types';

function Featured({ post }: { post: PostSummary }) {
  const date = new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return (
    <Link to={`/blog/${post.slug}`} className="group relative block overflow-hidden border border-line/15 bg-card/60 p-6 transition-colors duration-500 hover:border-signal/60 md:p-12">
      <div className="pointer-events-none absolute -right-10 -top-16 select-none font-display text-[18rem] leading-none text-foreground/[0.04] transition-transform duration-1000 ease-out-expo group-hover:-translate-x-6">
        ¶
      </div>
      <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <span className="rounded-full border border-signal/60 px-2.5 py-1 text-signal">Featured</span>
        <span>{date}</span>
        <span className="inline-flex items-center gap-1.5">
          {post.format === 'notebook' ? <><BookOpen size={11} /> Notebook</> : `${post.readingTime} min read`}
        </span>
      </div>
      <h2 className="relative mt-8 max-w-4xl font-display text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.95] tracking-[-0.025em] text-foreground">
        {post.title}
      </h2>
      <p className="relative mt-6 max-w-2xl text-[1.02rem] leading-relaxed text-foreground/65 line-clamp-3">{post.excerpt}</p>
      <span className="relative mt-10 inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-foreground group-hover:text-signal">
        Read it
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line/20 transition-all duration-500 group-hover:rotate-45 group-hover:border-signal group-hover:bg-signal group-hover:text-background">
          <ArrowUpRight size={15} />
        </span>
      </span>
    </Link>
  );
}

function BlogIndex() {
  const { data, loading } = useSiteConfig();
  const posts = data?.posts ?? [];
  const featured = posts.find(p => p.featured);
  const rest = featured ? posts.filter(p => p.slug !== featured.slug) : posts;

  return (
    <Container className="pb-28 pt-32 md:pb-40 md:pt-40">
      <div className="grid grid-cols-1 gap-y-6 md:grid-cols-12 md:gap-x-8">
        <div className="md:col-span-3">
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <span className="text-signal">§</span>
            <ScrambleText text="Writing" trigger="mount" />
          </div>
        </div>
        <div className="md:col-span-9">
          <ResolveText as="h1" text="Notes" className="display text-[clamp(4.5rem,14vw,13rem)] text-foreground" />
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/70">
            Thoughts on machine learning, systems, and building things from first principles.
          </p>
          <div className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {posts.length > 0 ? `${posts.length} ${posts.length === 1 ? 'entry' : 'entries'}` : ' '}
          </div>
        </div>
      </div>

      <div className="mt-20 md:mt-28">
        {loading && posts.length === 0 ? (
          <div className="space-y-6">
            <Skeleton className="h-72 w-full rounded-none" />
            <Skeleton className="h-24 w-full rounded-none" />
            <Skeleton className="h-24 w-full rounded-none" />
          </div>
        ) : posts.length === 0 ? (
          <div className="border border-dashed border-line/20 py-24 text-center">
            <p className="font-display text-4xl text-foreground">Still sampling.</p>
            <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">No notes yet, check back soon.</p>
          </div>
        ) : (
          <>
            {featured && <Featured post={featured} />}
            {rest.length > 0 && (
              <ol className="mt-16 border-t border-line/20">
                {rest.map((post, i) => <PostRow key={post.slug} post={post} index={i + (featured ? 2 : 1)} large />)}
              </ol>
            )}
          </>
        )}
      </div>
    </Container>
  );
}

export function BlogPage() {
  return (
    <PortfolioLayout variant="reading">
      <BlogIndex />
    </PortfolioLayout>
  );
}
