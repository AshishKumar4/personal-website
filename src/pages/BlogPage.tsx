import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { BlogPost } from '@shared/types';
import { api } from '@/lib/api-client';
import { Toaster, toast } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, User, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { getReadingTime } from '@/lib/text-utils';

export function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api<{ items: BlogPost[] }>('/api/posts');
        setPosts(response.items);
      } catch (error) {
        console.error("Failed to fetch posts:", error);
        toast.error('Failed to load blog posts.');
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: prefersReducedMotion ? 0 : 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <PortfolioLayout>
      <main className="relative z-10 py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground font-display">Blog</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Thoughts on technology, machine learning, and building things.
            </p>
            <div className="mt-4 h-1 w-20 bg-gradient-to-r from-primary to-transparent rounded-full" />
          </motion.div>

          <div className="mt-16">
            {loading ? (
              <div className="space-y-8">
                <div className="p-8 rounded-2xl border border-border bg-card">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-10 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="p-6 rounded-xl border border-border bg-card">
                      <Skeleton className="h-4 w-24 mb-3" />
                      <Skeleton className="h-6 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ))}
                </div>
              </div>
            ) : posts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles size={24} className="text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">No posts yet</h3>
                <p className="text-muted-foreground">Check back soon for new content!</p>
              </motion.div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {/* Featured Post - Latest */}
                <motion.div variants={itemVariants} className="mb-12">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles size={16} className="text-primary" />
                    <span className="text-sm font-mono text-primary">Featured Post</span>
                  </div>
                  <Link to={`/blog/${posts[0].slug}`} className="group block">
                    <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-primary via-primary/50 to-transparent group-hover:from-primary group-hover:via-primary group-hover:to-primary/50 transition-all duration-500">
                      <div className="relative bg-card rounded-2xl p-8 md:p-10">
                        <div className="flex flex-wrap items-center gap-4 mb-4">
                          <span className="px-3 py-1 text-xs font-mono bg-primary/10 text-primary rounded-full">
                            Article
                          </span>
                          <span className="flex items-center text-sm font-mono text-muted-foreground">
                            <Clock size={14} className="mr-1.5" />
                            {getReadingTime(posts[0].content)} min read
                          </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground group-hover:text-primary transition-colors duration-300 mb-4">
                          {posts[0].title}
                        </h2>
                        <p className="text-muted-foreground leading-relaxed mb-6 line-clamp-3">
                          {posts[0].content.substring(0, 200)}...
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-4 text-sm font-mono text-muted-foreground">
                            <span className="flex items-center">
                              <Calendar size={14} className="mr-1.5 text-primary" />
                              {new Date(posts[0].createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="flex items-center">
                              <User size={14} className="mr-1.5 text-primary" />
                              {posts[0].author}
                            </span>
                          </div>
                          <span className="flex items-center text-primary font-mono text-sm group-hover:gap-3 gap-1 transition-all duration-300">
                            Read more <ArrowRight size={16} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>

                {/* Post Grid - Remaining Posts */}
                {posts.length > 1 && (
                  <div>
                    <h3 className="text-lg font-mono text-muted-foreground mb-8">More Articles</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {posts.slice(1).map((post) => (
                        <motion.div key={post.slug} variants={itemVariants}>
                          <Link to={`/blog/${post.slug}`} className="group block h-full">
                            <div className="relative h-full p-[1px] rounded-xl bg-border group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-primary/50 transition-all duration-300">
                              <div className="h-full bg-card rounded-xl p-6 group-hover:-translate-y-1 transition-transform duration-300">
                                <div className="flex items-center gap-3 mb-3">
                                  <span className="px-2 py-0.5 text-xs font-mono bg-primary/10 text-primary rounded">
                                    Article
                                  </span>
                                  <span className="flex items-center text-xs font-mono text-muted-foreground">
                                    <Clock size={12} className="mr-1" />
                                    {getReadingTime(post.content)} min
                                  </span>
                                </div>
                                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300 mb-2 line-clamp-2">
                                  {post.title}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                  {post.content.substring(0, 100)}...
                                </p>
                                <div className="flex items-center justify-between mt-auto">
                                  <span className="text-xs font-mono text-muted-foreground">
                                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                  <ArrowRight
                                    size={16}
                                    className="text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                  />
                                </div>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </main>
      <Toaster theme="dark" />
    </PortfolioLayout>
  );
}
