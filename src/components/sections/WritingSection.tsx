import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, ArrowRight, BookOpen } from 'lucide-react';
import { BlogPost } from '@shared/types';
import { api } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { postExcerpt, postReadingTime } from '@/lib/post-preview';

export function WritingSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api<{ items: BlogPost[] }>('/api/posts');
        setPosts([...response.items].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  return (
    <motion.section
      id="writing"
      className="py-24 md:py-32"
      initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.6 }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="section-heading">
          <span className="font-mono text-accent text-xl md:text-2xl mr-3">04.</span> Recent Writing
        </h2>
        <div className="mt-12 space-y-4">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6">
                <Skeleton className="h-4 w-32 mb-3" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))
          ) : (
            posts.map((post, index) => (
              <motion.div
                key={post.slug}
                initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: prefersReducedMotion ? 0 : index * 0.1 }}
              >
                <Link to={`/blog/${post.slug}`} className="group block">
                  <div className="bg-card border border-border rounded-xl p-6 transition-all duration-300 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/5">
                    <div className="flex items-center gap-3 mb-2 text-xs font-mono text-muted-foreground">
                      <span>
                        {new Date(post.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {post.format === 'notebook' ? (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded inline-flex items-center gap-1">
                          <BookOpen size={11} />
                          Notebook
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Clock size={12} className="mr-1" />
                          {postReadingTime(post)} min read
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                      {post.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                      {postExcerpt(post, 140)}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </div>
        <div className="mt-8">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-primary transition-colors duration-300"
          >
            All posts <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
