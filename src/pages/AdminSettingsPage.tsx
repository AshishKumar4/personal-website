import { useState, useEffect } from 'react';
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
import { Loader2 } from 'lucide-react';

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
      <div>
        <h1 className="text-3xl font-bold text-foreground font-display">Site Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your portfolio's appearance and content.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Appearance</CardTitle>
            <CardDescription className="text-muted-foreground">
              Customize the look and feel of your site.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-10 w-[280px]" />
            ) : (
              <div className="space-y-2">
                <Label htmlFor="backgroundEffect" className="text-muted-foreground">
                  Background Effect
                </Label>
                <Select
                  value={config.backgroundEffect}
                  onValueChange={(value: SiteConfig['backgroundEffect']) =>
                    setConfig({ ...config, backgroundEffect: value })
                  }
                >
                  <SelectTrigger className="w-[280px] bg-background border-border text-foreground">
                    <SelectValue placeholder="Select an effect" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="neural">Neural Network ✨</SelectItem>
                    <SelectItem value="grid">Blueprint Grid</SelectItem>
                    <SelectItem value="particles">Cosmic Particles</SelectItem>
                    <SelectItem value="aurora">Northern Lights</SelectItem>
                    <SelectItem value="matrix">Matrix Rain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Homepage Content</CardTitle>
            <CardDescription className="text-muted-foreground">
              Update the content displayed on the homepage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subtitle" className="text-muted-foreground">
                    Hero Subtitle
                  </Label>
                  <Input
                    id="subtitle"
                    value={config.subtitle}
                    onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                    className="bg-background border-border text-foreground"
                    placeholder="Software Engineer & Tech Enthusiast"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-muted-foreground">
                    Hero Bio
                  </Label>
                  <Textarea
                    id="bio"
                    value={config.bio}
                    onChange={(e) => setConfig({ ...config, bio: e.target.value })}
                    rows={5}
                    className="bg-background border-border text-foreground"
                    placeholder="A short bio that appears in the hero section..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="about" className="text-muted-foreground">
                    About Me Section
                  </Label>
                  <Textarea
                    id="about"
                    value={config.about}
                    onChange={(e) => setConfig({ ...config, about: e.target.value })}
                    rows={8}
                    className="bg-background border-border text-foreground"
                    placeholder="Tell visitors about yourself, your background, interests..."
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="border-t border-border pt-6">
            <Button
              type="submit"
              disabled={saving || loading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
