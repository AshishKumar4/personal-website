import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { RidgeArt } from '@/components/site/RidgeArt';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/site/SectionHeader';
import { PostRow } from '@/components/site/PostRow';
import type { PostSummary } from '@shared/types';
import { cn } from '@/lib/utils';
import { MonoMeta, NightMasthead } from '@/components/reading/NightMasthead';
import { DISPLAY_TITLE, MONO_LABEL } from '@/components/reading/styles';
import { cleanExcerpt } from '@/components/reading/post-text';

function Featured({ post }: { post: PostSummary }) {
  const date = new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const excerpt = cleanExcerpt(post, 220);
  return (
    <Link to={`/blog/${post.slug}`} className="group grid grid-cols-1 gap-y-8 border-t border-white/10 pt-10 md:grid-cols-12 md:gap-x-8 md:pt-14">
      <div className="hidden md:col-span-5 md:col-start-8 md:row-start-1 md:block">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[3px] bg-card ring-1 ring-white/[0.07]">
          <RidgeArt seed={post.slug} className="h-full w-full opacity-80 transition-transform duration-[1600ms] ease-out-expo group-hover:scale-[1.04]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
        </div>
      </div>
      <div className="flex flex-col md:col-span-7 md:row-start-1">
        <MonoMeta className="text-foreground/60" items={[<span key="f" className="text-signal">Featured</span>, date, `${post.readingTime} min read`, post.format === 'notebook' ? 'Notebook' : null]} />
        <h2 className={cn(DISPLAY_TITLE, 'mt-6 text-[clamp(2rem,3.9vw,3.5rem)] font-[320] leading-[1.02] transition-colors duration-500 group-hover:text-signal')}>
          {post.title}
        </h2>
        {excerpt && <p className="mt-6 max-w-[48ch] font-serif text-[1.1875rem] leading-[1.55] text-foreground/70 text-pretty line-clamp-3">{excerpt}</p>}
        <span className={cn(MONO_LABEL, 'mt-auto inline-flex items-center gap-2 pt-10 text-foreground/70 transition-colors group-hover:text-foreground')}>
          Read the post <ArrowUpRight size={14} className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function BlogIndex() {
  const { data, loading } = useSiteConfig();
  const posts = data?.posts ?? [];
  const featured = posts.find(p => p.featured);
  const rest = (featured ? posts.filter(p => p.slug !== featured.slug) : posts).slice().sort((a, b) => b.createdAt - a.createdAt);
  const count = posts.length;

  return (
    <>
      <NightMasthead
        seed="notes"
        meta={[count > 0 ? `${count} ${count === 1 ? 'post' : 'posts'}` : null]}
        title="Blog"
        compact
      />
      <Container className="pb-28 md:pb-40">
        {loading && posts.length === 0 ? (
          <div className="space-y-6">
            <Skeleton className="h-72 w-full rounded-[3px] bg-white/5" />
            <Skeleton className="h-24 w-full bg-white/5" />
          </div>
        ) : posts.length === 0 ? (
          <p className="border-t border-white/10 py-16 font-serif text-[1.125rem] italic text-foreground/50">No posts yet.</p>
        ) : (
          <>
            {featured && <Featured post={featured} />}
            {rest.length > 0 && (
              <div className="mt-20 md:mt-24">
                <h2 className={cn(MONO_LABEL, 'mb-4 text-foreground/50')}>More posts</h2>
                <ol className="border-b border-white/10">
                  {rest.map((post, i) => <PostRow key={post.slug} post={post} index={i + (featured ? 2 : 1)} large />)}
                </ol>
              </div>
            )}
          </>
        )}
      </Container>
    </>
  );
}

export function BlogPage() {
  return (
    <PortfolioLayout variant="reading">
      <BlogIndex />
    </PortfolioLayout>
  );
}
