import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { ReadingSurface } from '@/components/layout/ReadingSurface';
import { BlogPost } from '@shared/types';
import { api } from '@/lib/api-client';
import { Toaster, toast } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, User, Clock } from 'lucide-react';
import { MarkdownContent } from '@/components/MarkdownContent';
import { NotebookFromJson } from '@/components/NotebookRenderer';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { getReadingTime } from '@/lib/text-utils';
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

export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!slug) return;
    const fetchPost = async () => {
      try {
        const response = await api<BlogPost>(`/api/posts/${slug}`);
        setPost(response);
      } catch (error) {
        console.error(`Failed to fetch post with slug ${slug}:`, error);
        toast.error('Failed to load blog post.');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  const isNotebook = post?.format === 'notebook';
  const colabUrl = post && isNotebook ? notebookColab(post.content) : undefined;
  const body = post && !isNotebook ? post.content : '';

  return (
    <PortfolioLayout variant="reading">
      <div className="relative z-10 px-4 pt-8">
        <div className="mx-auto w-full max-w-4xl">
          <Link to="/blog" className="inline-flex items-center text-primary font-mono text-sm hover:underline">
            <ArrowLeft size={16} className="mr-2" />
            All Posts
          </Link>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
      >
        <ReadingSurface>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full mt-8" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : post ? (
            <>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground font-display leading-tight">
                {post.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-mono text-muted-foreground">
                <span className="flex items-center">
                  <Calendar size={14} className="mr-2 text-primary" />
                  {new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
                <span className="flex items-center">
                  <User size={14} className="mr-2 text-primary" />
                  {post.author}
                </span>
                {!isNotebook && (
                  <span className="flex items-center">
                    <Clock size={14} className="mr-2 text-primary" />
                    {getReadingTime(body)} min read
                  </span>
                )}
                {isNotebook && (
                  <span className="flex items-center">
                    <Clock size={14} className="mr-2 text-primary" />
                    Notebook
                  </span>
                )}
              </div>
              {colabUrl && (
                <a
                  href={colabUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-mono text-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <span className="text-[#e8710a]"><ColabIcon /></span>
                  Open in Google Colab
                </a>
              )}
              <hr className="my-8 border-border" />
              {isNotebook ? (
                <NotebookFromJson json={post.content} />
              ) : (
                <MarkdownContent>{body}</MarkdownContent>
              )}
            </>
          ) : (
            <div className="text-center py-10">
              <h2 className="text-2xl font-bold text-foreground">Post not found</h2>
              <p className="mt-4 text-muted-foreground">The post you are looking for does not exist.</p>
            </div>
          )}
        </ReadingSurface>
      </motion.div>
      <Toaster theme="dark" />
    </PortfolioLayout>
  );
}
