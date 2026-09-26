import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { PostSummary } from '@shared/types';
import { Reveal } from '@/components/site/Reveal';

interface PostRowProps {
  post: PostSummary;
  index: number;
  large?: boolean;
}

export function PostRow({ post, large = false }: PostRowProps) {
  const date = new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return (
    <Reveal as="li" className="border-t border-white/10">
      <Link to={`/blog/${post.slug}`} className="group grid grid-cols-1 gap-y-2 py-8 md:grid-cols-12 md:gap-x-8 md:py-10">
        <div className="text-[0.875rem] text-foreground/45 tabular md:col-span-3">
          {date}
          <span className="ml-3 text-foreground/30">{post.format === 'notebook' ? 'Notebook' : `${post.readingTime} min`}</span>
        </div>
        <div className="md:col-span-8">
          <h3
            className={
              large
                ? 'font-display text-[clamp(1.7rem,3vw,2.6rem)] font-[480] leading-[1.08] tracking-[-0.03em] text-foreground transition-colors duration-300 group-hover:text-signal'
                : 'font-display text-[clamp(1.4rem,2.2vw,1.9rem)] font-[480] leading-[1.12] tracking-[-0.025em] text-foreground transition-colors duration-300 group-hover:text-signal'
            }
          >
            {post.title}
          </h3>
          <p className="mt-3 line-clamp-2 max-w-2xl text-[0.9375rem] leading-relaxed text-foreground/50">{post.excerpt}</p>
        </div>
        <div className="hidden justify-end md:col-span-1 md:flex">
          <ArrowUpRight size={18} className="text-foreground/35 transition-all duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
        </div>
      </Link>
    </Reveal>
  );
}
