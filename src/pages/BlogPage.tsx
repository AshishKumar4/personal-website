import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { BlogPost } from '@shared/types';
import { api } from '@/lib/api-client';
import { Toaster, toast } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Calendar, User } from 'lucide-react';
export function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
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
      transition: { staggerChildren: 0.1 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };
  return (
    <PortfolioLayout>
      <main className="relative z-10 py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl sm:text-5xl font-bold text-lightest-slate font-display">Blog</h1>
            <p className="mt-4 text-lg text-slate">Thoughts on technology, machine learning, and building things.</p>
          </motion.div>
          <div className="mt-16">
            {loading ? (
              <div className="space-y-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-8 w-3/4 bg-light-navy" />
                    <Skeleton className="h-4 w-1/2 bg-light-navy" />
                    <Skeleton className="h-4 w-full bg-light-navy" />
                  </div>
                ))}
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-12"
              >
                {posts.map((post) => (
                  <motion.div key={post.slug} variants={itemVariants}>
                    <Link to={`/blog/${post.slug}`}>
                      <Card className="bg-transparent border-none shadow-none group">
                        <CardHeader className="p-0">
                          <CardTitle className="text-2xl font-bold text-lightest-slate group-hover:text-green transition-colors duration-300">{post.title}</CardTitle>
                        </CardHeader>
                        <CardDescription className="mt-2 text-light-slate">
                          {post.content.substring(0, 150)}...
                        </CardDescription>
                        <CardFooter className="p-0 mt-4 flex items-center space-x-4 text-sm font-mono text-slate">
                          <div className="flex items-center">
                            <Calendar size={14} className="mr-2 text-green" />
                            {new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </div>
                          <div className="flex items-center">
                            <User size={14} className="mr-2 text-green" />
                            {post.author}
                          </div>
                        </CardFooter>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </main>
      <Toaster theme="dark" />
    </PortfolioLayout>
  );
}