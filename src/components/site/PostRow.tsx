import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import type { PostSummary } from '@shared/types';

interface PostRowProps {
  post: PostSummary;
  index: number;
  large?: boolean;
}

export function PostRow({ post, index, large = false }: PostRowProps) {
  const date = new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <li className="border-b border-line/10">
      <Link to={`/blog/${post.slug}`} className="group relative grid gap-y-3 py-8 md:grid-cols-12 md:gap-x-8 md:py-10">
        <span className="absolute left-0 top-[-1px] h-px w-0 bg-signal transition-all duration-700 ease-out-expo group-hover:w-full" />
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground md:col-span-3 md:flex-col md:items-start md:gap-1.5">
          <span className="text-signal">[{String(index).padStart(2, '0')}]</span>
          <time dateTime={new Date(post.createdAt).toISOString()}>{date}</time>
          <span className="inline-flex items-center gap-1.5">
            {post.format === 'notebook' ? (
              <>
                <BookOpen size={11} /> Notebook
              </>
            ) : (
              `${post.readingTime} min read`
            )}
          </span>
          {post.featured && <span className="rounded-full border border-signal/50 px-2 py-0.5 text-[9px] text-signal">Featured</span>}
        </div>
        <div className="md:col-span-8">
          <h3
            className={
              large
                ? 'font-display text-[clamp(2.2rem,4.4vw,4.25rem)] leading-[1] tracking-[-0.02em] text-foreground transition-transform duration-700 ease-out-expo group-hover:translate-x-2'
                : 'font-display text-[clamp(1.85rem,3.4vw,3.25rem)] leading-[1.02] tracking-[-0.018em] text-foreground transition-transform duration-700 ease-out-expo group-hover:translate-x-2'
            }
          >
            {post.title}
          </h3>
          <p className="mt-3 line-clamp-2 max-w-3xl text-[0.95rem] leading-relaxed text-foreground/60">{post.excerpt}</p>
        </div>
        <div className="hidden items-start justify-end md:col-span-1 md:flex">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line/15 transition-all duration-500 group-hover:rotate-45 group-hover:border-signal group-hover:bg-signal group-hover:text-background">
            <ArrowUpRight size={16} />
          </span>
        </div>
      </Link>
    </li>
  );
}
