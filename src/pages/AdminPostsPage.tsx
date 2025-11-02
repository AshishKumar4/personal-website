import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { BlogPost } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
export function AdminPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost> | null>(null);
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api<{ items: BlogPost[] }>('/api/posts');
      setPosts(response.items.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      toast.error('Failed to fetch posts.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);
  const handleEdit = (post: BlogPost) => {
    setCurrentPost(post);
    setDialogOpen(true);
  };
  const handleCreateNew = () => {
    setCurrentPost({ title: '', content: '', author: 'Ashish Kumar Singh' });
    setDialogOpen(true);
  };
  const handleDelete = async (slug: string) => {
    const token = getToken();
    try {
      await api(`/api/posts/${slug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Post deleted successfully.');
      fetchPosts();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete post.');
    }
  };
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPost) return;
    const token = getToken();
    const isEditing = !!currentPost.slug;
    const url = isEditing ? `/api/posts/${currentPost.slug}` : '/api/posts';
    const method = isEditing ? 'PUT' : 'POST';
    try {
      await api(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(currentPost),
      });
      toast.success(`Post ${isEditing ? 'updated' : 'created'} successfully.`);
      setDialogOpen(false);
      setCurrentPost(null);
      fetchPosts();
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${isEditing ? 'update' : 'create'} post.`);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-lightest-slate font-display">Manage Posts</h1>
        <Button onClick={handleCreateNew} className="bg-green text-dark-navy hover:bg-green/90">
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Post
        </Button>
      </div>
      <Card className="bg-light-navy border-lightest-navy/20">
        <CardHeader>
          <CardTitle className="text-lightest-slate">All Blog Posts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-lightest-navy/50 hover:bg-light-navy">
                <TableHead className="text-light-slate">Title</TableHead>
                <TableHead className="text-light-slate">Date</TableHead>
                <TableHead className="text-right text-light-slate">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="text-center">Loading posts...</TableCell></TableRow>
              ) : posts.length > 0 ? (
                posts.map((post) => (
                  <TableRow key={post.slug} className="border-lightest-navy/20 hover:bg-lightest-navy/10">
                    <TableCell className="font-medium text-lightest-slate">{post.title}</TableCell>
                    <TableCell>{new Date(post.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(post)} className="text-slate hover:text-green">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-slate hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-light-navy border-lightest-navy/20">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-lightest-slate">Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate">
                              This action cannot be undone. This will permanently delete the post.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(post.slug)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={3} className="text-center">No posts found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-light-navy border-lightest-navy/20 text-slate">
          <DialogHeader>
            <DialogTitle className="text-lightest-slate">{currentPost?.slug ? 'Edit Post' : 'Create New Post'}</DialogTitle>
          </DialogHeader>
          {currentPost && (
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-light-slate">Title</Label>
                <Input id="title" value={currentPost.title} onChange={(e) => setCurrentPost({ ...currentPost, title: e.target.value })} className="bg-dark-navy border-lightest-navy/50 text-lightest-slate focus:ring-green" />
              </div>
              <div>
                <Label htmlFor="content" className="text-light-slate">Content</Label>
                <Textarea id="content" value={currentPost.content} onChange={(e) => setCurrentPost({ ...currentPost, content: e.target.value })} rows={10} className="bg-dark-navy border-lightest-navy/50 text-lightest-slate focus:ring-green" />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit" className="bg-green text-dark-navy hover:bg-green/90">Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}