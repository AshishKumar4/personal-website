import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { PlusCircle, Edit, Trash2, Search, Loader2, ExternalLink } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [currentProject, setCurrentProject] = useState<Partial<Project> | null>(null);
  const [search, setSearch] = useState('');

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

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const searchLower = search.toLowerCase();
    return projects.filter(
      (proj) =>
        proj.name.toLowerCase().includes(searchLower) ||
        proj.description.toLowerCase().includes(searchLower) ||
        proj.repo.toLowerCase().includes(searchLower)
    );
  }, [projects, search]);

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

    if (!currentProject.name?.trim()) {
      toast.error('Project name is required.');
      return;
    }

    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-foreground font-display">Manage Projects</h1>
        <Button onClick={handleCreateNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Project
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-foreground">Key Projects</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background border-border"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-muted/50">
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Repo</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      <p className="text-muted-foreground mt-2">Loading projects...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredProjects.length > 0 ? (
                  filteredProjects.map((proj) => (
                    <TableRow key={proj.id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">{proj.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {proj.repo && (
                          <a
                            href={`https://github.com/${proj.repo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-primary"
                          >
                            {proj.repo}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(proj)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-foreground">Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                This will permanently delete this project entry.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(proj.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      {search ? 'No projects match your search.' : 'No projects found. Add your first project!'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {currentProject?.id ? 'Edit Project' : 'Add New Project'}
            </DialogTitle>
          </DialogHeader>
          {currentProject && (
            <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-muted-foreground">
                  Project Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={currentProject.name}
                  onChange={(e) => setCurrentProject({ ...currentProject, name: e.target.value })}
                  className="bg-background border-border"
                  placeholder="My Awesome Project"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repo" className="text-muted-foreground">
                  GitHub Repo (e.g., user/repo)
                </Label>
                <Input
                  id="repo"
                  value={currentProject.repo}
                  onChange={(e) => setCurrentProject({ ...currentProject, repo: e.target.value })}
                  className="bg-background border-border"
                  placeholder="username/repository"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url" className="text-muted-foreground">
                  Project URL
                </Label>
                <Input
                  id="url"
                  value={currentProject.url}
                  onChange={(e) => setCurrentProject({ ...currentProject, url: e.target.value })}
                  className="bg-background border-border"
                  placeholder="https://myproject.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-muted-foreground">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={currentProject.description}
                  onChange={(e) => setCurrentProject({ ...currentProject, description: e.target.value })}
                  className="bg-background border-border"
                  rows={4}
                  placeholder="Describe what this project does..."
                />
              </div>
              <DialogFooter className="pt-4 border-t border-border">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="border-border">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
