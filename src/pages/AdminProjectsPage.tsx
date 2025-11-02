import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Project } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
export function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Partial<Project> | null>(null);
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api<{ items: Project[] }>('/api/projects');
      setProjects(response.items);
    } catch (error) {
      toast.error('Failed to fetch projects.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);
  const handleEdit = (proj: Project) => {
    setCurrentProject(proj);
    setDialogOpen(true);
  };
  const handleCreateNew = () => {
    setCurrentProject({ name: '', description: '', repo: '', url: '' });
    setDialogOpen(true);
  };
  const handleDelete = async (id: string) => {
    const token = getToken();
    try {
      await api(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Project deleted successfully.');
      fetchProjects();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete project.');
    }
  };
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    const token = getToken();
    const isEditing = !!currentProject.id;
    const url = isEditing ? `/api/projects/${currentProject.id}` : '/api/projects';
    const method = isEditing ? 'PUT' : 'POST';
    const payload = { ...currentProject };
    if (!isEditing) {
      payload.id = payload.name?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    }
    try {
      await api(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      toast.success(`Project ${isEditing ? 'updated' : 'created'} successfully.`);
      setDialogOpen(false);
      setCurrentProject(null);
      fetchProjects();
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${isEditing ? 'update' : 'create'} project.`);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-lightest-slate font-display">Manage Projects</h1>
        <Button onClick={handleCreateNew} className="bg-green text-dark-navy hover:bg-green/90">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Project
        </Button>
      </div>
      <Card className="bg-light-navy border-lightest-navy/20">
        <CardHeader>
          <CardTitle className="text-lightest-slate">Key Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-lightest-navy/50 hover:bg-light-navy">
                <TableHead className="text-light-slate">Name</TableHead>
                <TableHead className="text-light-slate">Repo</TableHead>
                <TableHead className="text-right text-light-slate">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="text-center">Loading projects...</TableCell></TableRow>
              ) : projects.length > 0 ? (
                projects.map((proj) => (
                  <TableRow key={proj.id} className="border-lightest-navy/20 hover:bg-lightest-navy/10">
                    <TableCell className="font-medium text-lightest-slate">{proj.name}</TableCell>
                    <TableCell>{proj.repo}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(proj)} className="text-slate hover:text-green">
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
                              This will permanently delete this project entry.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(proj.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={3} className="text-center">No projects found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-light-navy border-lightest-navy/20 text-slate sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lightest-slate">{currentProject?.id ? 'Edit Project' : 'Add New Project'}</DialogTitle>
          </DialogHeader>
          {currentProject && (
            <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-6">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input id="name" value={currentProject.name} onChange={(e) => setCurrentProject({ ...currentProject, name: e.target.value })} className="bg-dark-navy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repo">GitHub Repo (e.g., user/repo)</Label>
                <Input id="repo" value={currentProject.repo} onChange={(e) => setCurrentProject({ ...currentProject, repo: e.target.value })} className="bg-dark-navy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">Project URL</Label>
                <Input id="url" value={currentProject.url} onChange={(e) => setCurrentProject({ ...currentProject, url: e.target.value })} className="bg-dark-navy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={currentProject.description} onChange={(e) => setCurrentProject({ ...currentProject, description: e.target.value })} className="bg-dark-navy" rows={4} />
              </div>
              <DialogFooter className="pt-4">
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