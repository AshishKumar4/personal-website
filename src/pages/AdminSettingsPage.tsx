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
export function AdminSettingsPage() {
  const [config, setConfig] = useState<SiteConfig>({ subtitle: '', bio: '' });
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
            <CardTitle className="text-lightest-slate">Hero Section Content</CardTitle>
            <CardDescription className="text-slate">
              Update the subtitle and bio displayed on the homepage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <>
                <Skeleton className="h-10 w-full bg-dark-navy" />
                <Skeleton className="h-24 w-full bg-dark-navy" />
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subtitle" className="text-light-slate">Subtitle</Label>
                  <Input
                    id="subtitle"
                    value={config.subtitle}
                    onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                    className="bg-dark-navy border-lightest-navy/50 text-lightest-slate focus:ring-green"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-light-slate">Bio</Label>
                  <Textarea
                    id="bio"
                    value={config.bio}
                    onChange={(e) => setConfig({ ...config, bio: e.target.value })}
                    rows={5}
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