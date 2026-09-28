import { Link } from 'react-router-dom';
import type { PostSummary } from '@shared/types';
import { Reveal } from '@/components/site/Reveal';
import { cleanExcerpt, formatDate } from './post-text';
import { PostCover } from './PostCover';

export function BlogRow({ post }: { post: PostSummary }) {
  const excerpt = cleanExcerpt(post, 200);
  return (
    <Reveal as="li" className="border-t border-foreground/10">
      <Link to={`/blog/${post.slug}`} className="group grid grid-cols-1 gap-y-5 py-8 md:grid-cols-12 md:items-center md:gap-x-10 md:py-10">
        <PostCover post={post} className="md:order-last md:col-span-4" />
        <div className="md:col-span-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.75rem] tabular text-foreground/55">
            <time dateTime={new Date(post.createdAt).toISOString()} className="text-foreground/80">{formatDate(post.createdAt, 'short')}</time>
            <span aria-hidden="true" className="h-px w-3 bg-foreground/20" />
            <span>{post.readingTime} min read</span>
            {post.format === 'notebook' && (
              <>
                <span aria-hidden="true" className="h-px w-3 bg-foreground/20" />
                <span className="text-foreground/45">Notebook</span>
              </>
            )}
          </div>
          <h3 className="t-section mt-4 text-[clamp(1.625rem,2.8vw,2.5rem)] leading-[1.06] text-foreground text-balance transition-colors duration-300 group-hover:text-signal">
            {post.title}
          </h3>
          {excerpt && <p className="t-narration mt-4 line-clamp-3 max-w-[56ch] text-[1.0625rem] leading-[1.6] text-foreground/65 text-pretty">{excerpt}</p>}
        </div>
      </Link>
    </Reveal>
  );
}
