import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { BlogPost } from '@shared/types';
import { api } from '@/lib/api-client';
import { Toaster, toast } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
export function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
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
  return (
    <PortfolioLayout>
      <main className="relative z-10 py-24 md:py-32">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link to="/blog" className="flex items-center text-green font-mono hover:underline mb-8">
              <ArrowLeft size={16} className="mr-2" />
              All Posts
            </Link>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-3/4 bg-light-navy" />
                <Skeleton className="h-6 w-1/2 bg-light-navy" />
                <Skeleton className="h-4 w-full bg-light-navy mt-8" />
                <Skeleton className="h-4 w-full bg-light-navy" />
                <Skeleton className="h-4 w-5/6 bg-light-navy" />
              </div>
            ) : post ? (
              <article>
                <h1 className="text-4xl sm:text-5xl font-bold text-lightest-slate font-display">{post.title}</h1>
                <div className="mt-4 flex items-center space-x-4 text-sm font-mono text-slate">
                  <div className="flex items-center">
                    <Calendar size={14} className="mr-2 text-green" />
                    {new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="flex items-center">
                    <User size={14} className="mr-2 text-green" />
                    {post.author}
                  </div>
                </div>
                <div className="mt-12 prose-styles max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {post.content}
                  </ReactMarkdown>
                </div>
              </article>
            ) : (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-lightest-slate">Post not found</h2>
                <p className="mt-4 text-slate">The post you are looking for does not exist.</p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <Toaster theme="dark" />
    </PortfolioLayout>
  );
}