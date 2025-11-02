import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { SiteConfig } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export function AdminSettingsPage() {
  const [config, setConfig] = useState<SiteConfig>({ subtitle: '', bio: '', about: '', backgroundEffect: 'grid' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await api<SiteConfig>('/api/config');
        setConfig(data);
      } catch (error) {
        toast.error('Failed to load site configuration.');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const token = getToken();
    try {
      await api('/api/config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      });
      toast.success('Site configuration updated successfully.');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update configuration.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-lightest-slate font-display">Site Settings</h1>
      <form onSubmit={handleSave}>
        <Card className="bg-light-navy border-lightest-navy/20">
          <CardHeader>
            <CardTitle className="text-lightest-slate">Appearance</CardTitle>
            <CardDescription className="text-slate">
              Customize the look and feel of your site.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-full bg-dark-navy" />
            ) : (
              <div className="space-y-2">
                <Label htmlFor="backgroundEffect" className="text-light-slate">Background Effect</Label>
                <Select
                  value={config.backgroundEffect}
                  onValueChange={(value: 'grid' | 'particles' | 'aurora' | 'vortex') => setConfig({ ...config, backgroundEffect: value })}
                >
                  <SelectTrigger className="w-[280px] bg-dark-navy border-lightest-navy/50 text-lightest-slate focus:ring-green">
                    <SelectValue placeholder="Select an effect" />
                  </SelectTrigger>
                  <SelectContent className="bg-light-navy border-lightest-navy/20 text-slate">
                    <SelectItem value="grid">Blueprint Grid</SelectItem>
                    <SelectItem value="particles">Cosmic Particles</SelectItem>
                    <SelectItem value="aurora">Northern Lights</SelectItem>
                    <SelectItem value="vortex">Cosmic Vortex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-light-navy border-lightest-navy/20 mt-6">
          <CardHeader>
            <CardTitle className="text-lightest-slate">Homepage Content</CardTitle>
            <CardDescription className="text-slate">
              Update the content displayed on the homepage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <>
                <Skeleton className="h-10 w-full bg-dark-navy" />
                <Skeleton className="h-24 w-full bg-dark-navy" />
                <Skeleton className="h-32 w-full bg-dark-navy" />
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subtitle" className="text-light-slate">Hero Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={config.subtitle}
                    onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                    className="bg-dark-navy border-lightest-navy/50 text-lightest-slate focus:ring-green"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-light-slate">Hero Bio</Label>
                  <Textarea
                    id="bio"
                    value={config.bio}
                    onChange={(e) => setConfig({ ...config, bio: e.target.value })}
                    rows={5}
                    className="bg-dark-navy border-lightest-navy/50 text-lightest-slate focus:ring-green"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="about" className="text-light-slate">About Me Section</Label>
                  <Textarea
                    id="about"
                    value={config.about}
                    onChange={(e) => setConfig({ ...config, about: e.target.value })}
                    rows={8}
                    className="bg-dark-navy border-lightest-navy/50 text-lightest-slate focus:ring-green"
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={saving || loading} className="bg-green text-dark-navy hover:bg-green/90">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}