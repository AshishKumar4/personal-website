import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { PostSummary } from '@shared/types';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/site/Reveal';
import { cleanExcerpt, formatDate } from '@/components/reading/post-text';

interface PostRowProps {
  post: PostSummary;
  index: number;
  large?: boolean;
}

export function PostRow({ post, large = false }: PostRowProps) {
  const excerpt = cleanExcerpt(post, 180);
  return (
    <Reveal as="li" className="border-t border-foreground/10">
      <Link to={`/blog/${post.slug}`} className="group grid grid-cols-1 gap-y-3 py-8 md:grid-cols-12 md:gap-x-8 md:py-10">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[0.75rem] tabular text-foreground/55 md:col-span-2 md:flex-col md:gap-1 md:pt-1.5">
          <time dateTime={new Date(post.createdAt).toISOString()} className="text-foreground/80">{formatDate(post.createdAt, 'short')}</time>
          <span>{post.readingTime} min read</span>
          {post.format === 'notebook' && <span className="text-foreground/45">Notebook</span>}
        </div>
        <div className="md:col-span-9">
          <h3
            className={cn(
              'text-foreground transition-colors duration-300 group-hover:text-signal text-balance',
              large ? 't-section text-[clamp(1.75rem,3.2vw,2.75rem)] leading-[1.06]' : 't-name text-[clamp(1.5rem,2.3vw,2.125rem)] leading-[1.1]',
            )}
          >
            {post.title}
          </h3>
          {excerpt && <p className="t-narration mt-3 line-clamp-2 max-w-[60ch] text-[1.0625rem] leading-[1.55] text-foreground/65 text-pretty">{excerpt}</p>}
        </div>
        <div className="hidden justify-end md:col-span-1 md:flex md:pt-2">
          <ArrowUpRight size={18} aria-hidden="true" className="text-foreground/35 transition-all duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
      </Link>
    </Reveal>
  );
}
