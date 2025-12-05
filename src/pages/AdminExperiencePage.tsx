import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { Experience } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2, Search, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export function AdminExperiencePage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [currentExperience, setCurrentExperience] = useState<Partial<Experience> | null>(null);
  const [search, setSearch] = useState('');

  const fetchExperiences = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api<{ items: Experience[] }>('/api/experiences');
      setExperiences(response.items);
    } catch (error) {
      toast.error('Failed to fetch experiences.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExperiences();
  }, [fetchExperiences]);

  const filteredExperiences = useMemo(() => {
    if (!search.trim()) return experiences;
    const searchLower = search.toLowerCase();
    return experiences.filter(
      (exp) =>
        exp.company.toLowerCase().includes(searchLower) ||
        exp.role.toLowerCase().includes(searchLower) ||
        exp.location.toLowerCase().includes(searchLower)
    );
  }, [experiences, search]);

  const handleEdit = (exp: Experience) => {
    setCurrentExperience(exp);
    setDialogOpen(true);
  };

  const handleCreateNew = () => {
    setCurrentExperience({ company: '', role: '', duration: '', location: '', description: '', skills: [], logoUrl: '' });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const token = getToken();
    try {
      await api(`/api/experiences/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Experience deleted successfully.');
      fetchExperiences();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete experience.');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExperience) return;

    if (!currentExperience.company?.trim() || !currentExperience.role?.trim()) {
      toast.error('Company and role are required.');
      return;
    }

    setSaving(true);
    const token = getToken();
    const isEditing = !!currentExperience.id;
    const url = isEditing ? `/api/experiences/${currentExperience.id}` : '/api/experiences';
    const method = isEditing ? 'PUT' : 'POST';
    const payload = { ...currentExperience };
    if (typeof payload.skills === 'string') {
      payload.skills = (payload.skills as string).split(',').map(s => s.trim()).filter(Boolean);
    }

    try {
      await api(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      toast.success(`Experience ${isEditing ? 'updated' : 'created'} successfully.`);
      setDialogOpen(false);
      setCurrentExperience(null);
      fetchExperiences();
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${isEditing ? 'update' : 'create'} experience.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-foreground font-display">Manage Experience</h1>
        <Button onClick={handleCreateNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Experience
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-foreground">Work History</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search experiences..."
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
                  <TableHead className="text-muted-foreground">Company</TableHead>
                  <TableHead className="text-muted-foreground">Role</TableHead>
                  <TableHead className="text-muted-foreground hidden md:table-cell">Duration</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      <p className="text-muted-foreground mt-2">Loading experiences...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredExperiences.length > 0 ? (
                  filteredExperiences.map((exp) => (
                    <TableRow key={exp.id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">{exp.company}</TableCell>
                      <TableCell className="text-muted-foreground">{exp.role}</TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">{exp.duration}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(exp)}
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
                                This will permanently delete this experience entry.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(exp.id)}
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
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {search ? 'No experiences match your search.' : 'No experiences found. Add your first entry!'}
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
              {currentExperience?.id ? 'Edit Experience' : 'Add New Experience'}
            </DialogTitle>
          </DialogHeader>
          {currentExperience && (
            <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-muted-foreground">
                    Company <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company"
                    value={currentExperience.company}
                    onChange={(e) => setCurrentExperience({ ...currentExperience, company: e.target.value })}
                    className="bg-background border-border"
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-muted-foreground">
                    Role <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="role"
                    value={currentExperience.role}
                    onChange={(e) => setCurrentExperience({ ...currentExperience, role: e.target.value })}
                    className="bg-background border-border"
                    placeholder="Software Engineer"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-muted-foreground">
                    Duration
                  </Label>
                  <Input
                    id="duration"
                    value={currentExperience.duration}
                    onChange={(e) => setCurrentExperience({ ...currentExperience, duration: e.target.value })}
                    className="bg-background border-border"
                    placeholder="Jan 2023 - Present"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-muted-foreground">
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={currentExperience.location}
                    onChange={(e) => setCurrentExperience({ ...currentExperience, location: e.target.value })}
                    className="bg-background border-border"
                    placeholder="San Francisco, CA"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoUrl" className="text-muted-foreground">
                  Logo URL
                </Label>
                <Input
                  id="logoUrl"
                  value={currentExperience.logoUrl}
                  onChange={(e) => setCurrentExperience({ ...currentExperience, logoUrl: e.target.value })}
                  className="bg-background border-border"
                  placeholder="https://company.com/logo.png"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-muted-foreground">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={currentExperience.description}
                  onChange={(e) => setCurrentExperience({ ...currentExperience, description: e.target.value })}
                  className="bg-background border-border"
                  rows={4}
                  placeholder="Describe your responsibilities and achievements..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills" className="text-muted-foreground">
                  Skills (comma-separated)
                </Label>
                <Input
                  id="skills"
                  value={Array.isArray(currentExperience.skills) ? currentExperience.skills.join(', ') : currentExperience.skills}
                  onChange={(e) => setCurrentExperience({ ...currentExperience, skills: e.target.value.split(',').map(s => s.trim()) })}
                  className="bg-background border-border"
                  placeholder="React, TypeScript, Node.js"
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
