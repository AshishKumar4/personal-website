import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PortfolioLayout } from '@/components/layout/PortfolioLayout';
import { AnimatedGridBackground } from '@/components/ui/AnimatedGridBackground';
import { BlogPost, SiteConfig, ChangePasswordPayload } from '@shared/types';
import { api } from '@/lib/api-client';
import { getToken, clearToken } from '@/lib/auth';
import { Toaster, toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, Edit, PlusCircle, Settings, Save, KeyRound } from 'lucide-react';
export function AdminPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<BlogPost | null>(null);
  const [postFormData, setPostFormData] = useState({ title: '', content: '' });
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({ subtitle: '', bio: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
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
  const fetchConfig = useCallback(async () => {
    try {
      const config = await api<SiteConfig>('/api/config');
      setSiteConfig(config);
    } catch (error) {
      console.error("Failed to fetch site config:", error);
      toast.error('Failed to load site settings.');
    }
  }, []);
  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/admin/login');
    } else {
      fetchPosts();
      fetchConfig();
    }
  }, [navigate, fetchPosts, fetchConfig]);
  const handleLogout = () => {
    clearToken();
    navigate('/admin/login');
  };
  const handlePostInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPostFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleConfigInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSiteConfig(prev => ({ ...prev, [name]: value }));
  };
  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };
  const handleEditClick = (post: BlogPost) => {
    setIsEditing(post);
    setPostFormData({ title: post.title, content: post.content });
  };
  const handleCancelEdit = () => {
    setIsEditing(null);
    setPostFormData({ title: '', content: '' });
  };
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const body = JSON.stringify({ ...postFormData, author: "Ashish Kumar Singh" });
    try {
      if (isEditing) {
        await api(`/api/posts/${isEditing.slug}`, { method: 'PUT', headers, body });
        toast.success('Post updated successfully!');
      } else {
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
  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    try {
      await api('/api/config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(siteConfig),
      });
      toast.success('Site settings updated successfully!');
    } catch (error: any) {
      console.error("Failed to save site settings:", error);
      toast.error(error?.message || 'Failed to save site settings.');
    }
  };
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters long.");
      return;
    }
    const token = getToken();
    if (!token) return;
    try {
      const payload: ChangePasswordPayload = {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      };
      await api('/api/admin/change-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      toast.success('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error("Failed to change password:", error);
      toast.error(error?.message || 'Failed to change password.');
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-lightest-slate font-display">Admin Panel</h1>
            <Button onClick={handleLogout} variant="outline" className="border-green text-green hover:bg-green-tint hover:text-green">Logout</Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="bg-light-navy border-lightest-navy/20">
                <CardHeader>
                  <CardTitle className="text-2xl text-lightest-slate flex items-center"><Settings className="mr-2" /> Site Settings</CardTitle>
                </CardHeader>
                <form onSubmit={handleConfigSubmit}>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="subtitle" className="text-light-slate">Hero Subtitle</Label>
                      <Input id="subtitle" name="subtitle" value={siteConfig.subtitle} onChange={handleConfigInputChange} required className="bg-dark-navy text-lightest-slate" />
                    </div>
                    <div>
                      <Label htmlFor="bio" className="text-light-slate">Hero Bio</Label>
                      <Textarea id="bio" name="bio" value={siteConfig.bio} onChange={handleConfigInputChange} required rows={8} className="bg-dark-navy text-lightest-slate" />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button type="submit" className="bg-green text-dark-navy hover:bg-green/90"><Save className="mr-2 h-4 w-4" /> Save Settings</Button>
                  </CardFooter>
                </form>
              </Card>
              <Card className="bg-light-navy border-lightest-navy/20">
                <CardHeader>
                  <CardTitle className="text-2xl text-lightest-slate flex items-center"><KeyRound className="mr-2" /> Change Password</CardTitle>
                </CardHeader>
                <form onSubmit={handlePasswordSubmit}>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="currentPassword" className="text-light-slate">Current Password</Label>
                      <Input id="currentPassword" name="currentPassword" type="password" value={passwordData.currentPassword} onChange={handlePasswordInputChange} required className="bg-dark-navy text-lightest-slate" />
                    </div>
                    <div>
                      <Label htmlFor="newPassword" className="text-light-slate">New Password</Label>
                      <Input id="newPassword" name="newPassword" type="password" value={passwordData.newPassword} onChange={handlePasswordInputChange} required className="bg-dark-navy text-lightest-slate" />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword" className="text-light-slate">Confirm New Password</Label>
                      <Input id="confirmPassword" name="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={handlePasswordInputChange} required className="bg-dark-navy text-lightest-slate" />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button type="submit" className="bg-green text-dark-navy hover:bg-green/90"><Save className="mr-2 h-4 w-4" /> Update Password</Button>
                  </CardFooter>
                </form>
              </Card>
              <Card className="bg-light-navy border-lightest-navy/20">
                <CardHeader>
                  <CardTitle className="text-2xl text-lightest-slate flex items-center">
                    {isEditing ? <Edit className="mr-2" /> : <PlusCircle className="mr-2" />}
                    {isEditing ? 'Edit Post' : 'Create New Post'}
                  </CardTitle>
                </CardHeader>
                <form onSubmit={handlePostSubmit}>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title" className="text-light-slate">Title</Label>
                      <Input id="title" name="title" value={postFormData.title} onChange={handlePostInputChange} required className="bg-dark-navy text-lightest-slate" />
                    </div>
                    <div>
                      <Label htmlFor="content" className="text-light-slate">Content</Label>
                      <Textarea id="content" name="content" value={postFormData.content} onChange={handlePostInputChange} required rows={10} className="bg-dark-navy text-lightest-slate" />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2">
                    {isEditing && <Button type="button" variant="ghost" onClick={handleCancelEdit} className="text-slate hover:text-lightest-slate">Cancel</Button>}
                    <Button type="submit" className="bg-green text-dark-navy hover:bg-green/90">{isEditing ? 'Update Post' : 'Create Post'}</Button>
                  </CardFooter>
                </form>
              </Card>
            </div>
            <div className="lg:col-span-3">
              <h2 className="text-3xl font-bold text-lightest-slate mb-4">Existing Posts</h2>
              <div className="space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2">
                {loading ? <p className="text-slate">Loading posts...</p> : posts.map(post => (
                  <motion.div key={post.slug} initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
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