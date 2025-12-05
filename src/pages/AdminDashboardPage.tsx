import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Briefcase, Code, PlusCircle, ArrowRight, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import { BlogPost, Experience, Project } from '@shared/types';

interface DashboardStats {
  posts: number;
  experiences: number;
  projects: number;
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({ posts: 0, experiences: 0, projects: 0 });
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [postsRes, experiencesRes, projectsRes] = await Promise.all([
          api<{ items: BlogPost[] }>('/api/posts'),
          api<{ items: Experience[] }>('/api/experiences'),
          api<{ items: Project[] }>('/api/projects'),
        ]);

        setStats({
          posts: postsRes.items.length,
          experiences: experiencesRes.items.length,
          projects: projectsRes.items.length,
        });

        setRecentPosts(
          postsRes.items
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5)
        );
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    { label: 'Blog Posts', value: stats.posts, icon: FileText, href: '/admin/posts', color: 'text-blue-500' },
    { label: 'Experience', value: stats.experiences, icon: Briefcase, href: '/admin/experience', color: 'text-green-500' },
    { label: 'Projects', value: stats.projects, icon: Code, href: '/admin/projects', color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here's an overview of your portfolio.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={stat.href}>
              <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 flex items-center group-hover:text-primary transition-colors">
                    View all <ArrowRight size={12} className="ml-1" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
            <CardDescription>Common tasks you might want to do</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/posts">
              <Button variant="outline" className="w-full justify-start border-border hover:bg-muted">
                <PlusCircle className="mr-2 h-4 w-4 text-primary" />
                Create New Blog Post
              </Button>
            </Link>
            <Link to="/admin/projects">
              <Button variant="outline" className="w-full justify-start border-border hover:bg-muted">
                <PlusCircle className="mr-2 h-4 w-4 text-primary" />
                Add New Project
              </Button>
            </Link>
            <Link to="/admin/experience">
              <Button variant="outline" className="w-full justify-start border-border hover:bg-muted">
                <PlusCircle className="mr-2 h-4 w-4 text-primary" />
                Add Experience Entry
              </Button>
            </Link>
            <Link to="/admin/settings">
              <Button variant="outline" className="w-full justify-start border-border hover:bg-muted">
                <Activity className="mr-2 h-4 w-4 text-primary" />
                Update Site Settings
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Posts */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Posts</CardTitle>
            <CardDescription>Your latest blog posts</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentPosts.length > 0 ? (
              <div className="space-y-3">
                {recentPosts.map((post) => (
                  <Link
                    key={post.slug}
                    to={`/admin/posts`}
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-muted transition-colors group"
                  >
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary">
                        {post.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No posts yet</p>
                <Link to="/admin/posts">
                  <Button variant="link" size="sm" className="text-primary mt-1">
                    Create your first post
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
