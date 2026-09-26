import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { PostSummary } from '@shared/types';
import { cn } from '@/lib/utils';
import { Reveal } from '@/components/site/Reveal';

interface PostRowProps {
  post: PostSummary;
  index: number;
  large?: boolean;
}

export function PostRow({ post, large = false }: PostRowProps) {
  const date = new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return (
    <Reveal as="li" className="border-t border-foreground/10">
      <Link to={`/blog/${post.slug}`} className="group grid grid-cols-1 gap-y-3 py-8 md:grid-cols-12 md:gap-x-8 md:py-10">
        <div className="flex gap-4 font-mono text-[0.75rem] text-foreground/50 tabular md:col-span-2 md:flex-col md:gap-1">
          <span className="text-foreground/80">{date}</span>
          <span>{post.format === 'notebook' ? 'Notebook' : `${post.readingTime} min read`}</span>
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
          <p className="t-narration mt-3 line-clamp-2 max-w-[62ch] text-[1.0625rem] leading-[1.55] text-foreground/60">{post.excerpt}</p>
        </div>
        <div className="hidden justify-end md:col-span-1 md:flex">
          <ArrowUpRight size={18} className="text-foreground/35 transition-all duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
      </Link>
    </Reveal>
  );
}
