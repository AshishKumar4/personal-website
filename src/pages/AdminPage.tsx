import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { AnimatedGridBackground } from '@/components/ui/AnimatedGridBackground';
import { BlogPost } from '@shared/types';
import { api } from '@/lib/api-client';
import { getToken, clearToken } from '@/lib/auth';
import { Toaster, toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, Edit, PlusCircle } from 'lucide-react';
export function AdminPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<BlogPost | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const fetchPosts = useCallback(async () => {
    try {
      const response = await api<{ items: BlogPost[] }>('/api/posts');
      setPosts(response.items);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      toast.error('Failed to load blog posts.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/admin/login');
    } else {
      fetchPosts();
    }
  }, [navigate, fetchPosts]);
  const handleLogout = () => {
    clearToken();
    navigate('/admin/login');
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleEditClick = (post: BlogPost) => {
    setIsEditing(post);
    setFormData({ title: post.title, content: post.content });
  };
  const handleCancelEdit = () => {
    setIsEditing(null);
    setFormData({ title: '', content: '' });
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const body = JSON.stringify({ ...formData, author: "Ashish Kumar Singh" });
    try {
      if (isEditing) {
        // Update post
        await api(`/api/posts/${isEditing.slug}`, { method: 'PUT', headers, body });
        toast.success('Post updated successfully!');
      } else {
        // Create post
        await api('/api/posts', { method: 'POST', headers, body });
        toast.success('Post created successfully!');
      }
      handleCancelEdit();
      fetchPosts();
    } catch (error: any) {
      console.error("Failed to save post:", error);
      toast.error(error?.message || 'Failed to save post.');
    }
  };
  const handleDelete = async (slug: string) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    const token = getToken();
    if (!token) return;
    try {
      await api(`/api/posts/${slug}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      toast.success('Post deleted successfully!');
      fetchPosts();
    } catch (error: any) {
      console.error("Failed to delete post:", error);
      toast.error(error?.message || 'Failed to delete post.');
    }
  };
  return (
    <PortfolioLayout>
      <AnimatedGridBackground />
      <main className="relative z-10 py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-lightest-slate font-display">Admin Panel</h1>
            <Button onClick={handleLogout} variant="outline" className="border-green text-green hover:bg-green-tint hover:text-green">Logout</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <Card className="bg-light-navy border-lightest-navy/20">
                <CardHeader>
                  <CardTitle className="text-2xl text-lightest-slate flex items-center">
                    {isEditing ? <Edit className="mr-2" /> : <PlusCircle className="mr-2" />}
                    {isEditing ? 'Edit Post' : 'Create New Post'}
                  </CardTitle>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title" className="text-light-slate">Title</Label>
                      <Input id="title" name="title" value={formData.title} onChange={handleInputChange} required className="bg-dark-navy text-lightest-slate" />
                    </div>
                    <div>
                      <Label htmlFor="content" className="text-light-slate">Content</Label>
                      <Textarea id="content" name="content" value={formData.content} onChange={handleInputChange} required rows={10} className="bg-dark-navy text-lightest-slate" />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2">
                    {isEditing && <Button type="button" variant="ghost" onClick={handleCancelEdit} className="text-slate hover:text-lightest-slate">Cancel</Button>}
                    <Button type="submit" className="bg-green text-dark-navy hover:bg-green/90">{isEditing ? 'Update Post' : 'Create Post'}</Button>
                  </CardFooter>
                </form>
              </Card>
            </div>
            <div className="md:col-span-2">
              <h2 className="text-3xl font-bold text-lightest-slate mb-4">Existing Posts</h2>
              <div className="space-y-4">
                {loading ? <p className="text-slate">Loading posts...</p> : posts.map(post => (
                  <motion.div key={post.slug} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Card className="bg-light-navy border-lightest-navy/20">
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-lightest-slate">{post.title}</p>
                          <p className="text-sm text-slate font-mono">{new Date(post.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button size="icon" variant="ghost" onClick={() => handleEditClick(post)} className="text-slate hover:text-green"><Edit size={16} /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(post.slug)} className="text-slate hover:text-red-500"><Trash2 size={16} /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Toaster theme="dark" />
    </PortfolioLayout>
  );
}