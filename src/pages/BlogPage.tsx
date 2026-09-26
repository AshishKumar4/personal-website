import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { RidgeArt } from '@/components/site/RidgeArt';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { useSiteConfig } from '@/contexts/SiteConfigContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Container } from '@/components/site/SectionHeader';
import { PostRow } from '@/components/site/PostRow';
import type { PostSummary } from '@shared/types';

function Featured({ post }: { post: PostSummary }) {
  const date = new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return (
    <Link to={`/blog/${post.slug}`} className="group block overflow-hidden rounded-2xl ring-1 ring-white/[0.08]">
      <div className="relative h-56 overflow-hidden md:h-72">
        <RidgeArt seed={post.slug} className="h-full w-full transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
      </div>
      <div className="bg-card px-6 pb-8 md:px-10 md:pb-10">
        <div className="flex flex-wrap items-center gap-3 text-[0.8125rem] text-foreground/45">
          <span className="text-signal">Featured</span>
          <span>{date}</span>
          <span>{post.format === 'notebook' ? 'Notebook' : `${post.readingTime} min read`}</span>
        </div>
        <h2 className="mt-4 max-w-4xl font-display text-[clamp(2rem,4.2vw,3.6rem)] font-[500] leading-[1.02] tracking-[-0.035em] text-foreground">
          {post.title}
        </h2>
        <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-foreground/55 line-clamp-3">{post.excerpt}</p>
        <span className="mt-8 inline-flex items-center gap-1.5 text-[0.9375rem] text-foreground transition-colors group-hover:text-signal">
          Read it <ArrowUpRight size={15} />
        </span>
      </div>
    </Link>
  );
}

function BlogIndex() {
  const { data, loading } = useSiteConfig();
  const posts = data?.posts ?? [];
  const featured = posts.find(p => p.featured);
  const rest = featured ? posts.filter(p => p.slug !== featured.slug) : posts;

  return (
    <Container className="pb-28 pt-36 md:pb-40 md:pt-48">
      <div className="grid grid-cols-1 gap-y-6 md:grid-cols-12 md:gap-x-8">
        <div className="text-[0.8125rem] text-foreground/50 md:col-span-3">Writing</div>
        <div className="md:col-span-9">
          <h1 className="font-display text-[clamp(3rem,8vw,7.5rem)] font-[540] leading-[0.92] tracking-[-0.05em] text-foreground">Notes</h1>
          <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-foreground/60">
            On machine learning, systems, and building things from first principles.
          </p>
        </div>
      </div>

      <div className="mt-20 md:mt-28">
        {loading && posts.length === 0 ? (
          <div className="space-y-6">
            <Skeleton className="h-72 w-full rounded-2xl bg-white/5" />
            <Skeleton className="h-24 w-full bg-white/5" />
          </div>
        ) : posts.length === 0 ? (
          <p className="border-t border-white/10 py-16 text-foreground/50">No posts yet. Check back soon.</p>
        ) : (
          <>
            {featured && <Featured post={featured} />}
            {rest.length > 0 && (
              <ol className="mt-16 border-b border-white/10">
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
