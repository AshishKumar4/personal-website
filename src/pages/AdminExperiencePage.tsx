import React, { useState, useEffect, useCallback } from 'react';
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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
export function AdminExperiencePage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [currentExperience, setCurrentExperience] = useState<Partial<Experience> | null>(null);
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
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-lightest-slate font-display">Manage Experience</h1>
        <Button onClick={handleCreateNew} className="bg-green text-dark-navy hover:bg-green/90">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Experience
        </Button>
      </div>
      <Card className="bg-light-navy border-lightest-navy/20">
        <CardHeader>
          <CardTitle className="text-lightest-slate">Work History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-lightest-navy/50 hover:bg-light-navy">
                <TableHead className="text-light-slate">Company</TableHead>
                <TableHead className="text-light-slate">Role</TableHead>
                <TableHead className="text-right text-light-slate">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="text-center">Loading experiences...</TableCell></TableRow>
              ) : experiences.length > 0 ? (
                experiences.map((exp) => (
                  <TableRow key={exp.id} className="border-lightest-navy/20 hover:bg-lightest-navy/10">
                    <TableCell className="font-medium text-lightest-slate">{exp.company}</TableCell>
                    <TableCell>{exp.role}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(exp)} className="text-slate hover:text-green">
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
                              This will permanently delete this experience entry.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(exp.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={3} className="text-center">No experiences found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-light-navy border-lightest-navy/20 text-slate sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lightest-slate">{currentExperience?.id ? 'Edit Experience' : 'Add New Experience'}</DialogTitle>
          </DialogHeader>
          {currentExperience && (
            <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-6">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={currentExperience.company} onChange={(e) => setCurrentExperience({ ...currentExperience, company: e.target.value })} className="bg-dark-navy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={currentExperience.role} onChange={(e) => setCurrentExperience({ ...currentExperience, role: e.target.value })} className="bg-dark-navy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input id="duration" value={currentExperience.duration} onChange={(e) => setCurrentExperience({ ...currentExperience, duration: e.target.value })} className="bg-dark-navy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={currentExperience.location} onChange={(e) => setCurrentExperience({ ...currentExperience, location: e.target.value })} className="bg-dark-navy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input id="logoUrl" value={currentExperience.logoUrl} onChange={(e) => setCurrentExperience({ ...currentExperience, logoUrl: e.target.value })} className="bg-dark-navy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={currentExperience.description} onChange={(e) => setCurrentExperience({ ...currentExperience, description: e.target.value })} className="bg-dark-navy" rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">Skills (comma-separated)</Label>
                <Input id="skills" value={Array.isArray(currentExperience.skills) ? currentExperience.skills.join(', ') : currentExperience.skills} onChange={(e) => setCurrentExperience({ ...currentExperience, skills: e.target.value.split(',').map(s => s.trim()) })} className="bg-dark-navy" />
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