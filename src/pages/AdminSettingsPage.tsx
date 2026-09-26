import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpRight, ImageUp, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { uploadImageFile } from '@/lib/upload-image';
import { applyAccent, loadHome } from '@/lib/site-data';
import { ACCENT_PRESETS, DEFAULT_SITE_EXTRAS, type AccentPreset, type SiteConfig, type SiteFact } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';

const ACCENT_SWATCH: Record<AccentPreset, { label: string; color: string }> = {
  vermilion: { label: 'Vermilion', color: 'hsl(16 100% 56%)' },
  ultraviolet: { label: 'Ultraviolet', color: 'hsl(258 100% 72%)' },
  cobalt: { label: 'Cobalt', color: 'hsl(218 100% 64%)' },
  acid: { label: 'Acid', color: 'hsl(74 100% 55%)' },
  amber: { label: 'Amber', color: 'hsl(40 100% 58%)' },
};

const EMPTY: SiteConfig = { subtitle: '', bio: '', about: '', aboutStory: '', ...DEFAULT_SITE_EXTRAS };

function Panel({ index, title, description, children }: { index: string; title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-6 border-t border-border py-10 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">{index}</div>
        <h2 className="mt-2 font-display text-3xl leading-none text-foreground">{title}</h2>
        <p className="mt-3 max-w-xs text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-6 lg:col-span-8">{children}</div>
    </section>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <Label htmlFor={id} className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</Label>
        {hint && <span className="text-xs text-muted-foreground/80">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function AdminSettingsPage() {
  const [config, setConfig] = useState<SiteConfig>(EMPTY);
  const [saved, setSaved] = useState<SiteConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedAccent = useRef<AccentPreset>('vermilion');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await api<SiteConfig>('/api/config');
        const merged = { ...EMPTY, ...data };
        setConfig(merged);
        setSaved(merged);
        savedAccent.current = merged.accent ?? 'vermilion';
      } catch {
        toast.error('Failed to load site configuration.');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
    return () => applyAccent({ accent: savedAccent.current });
  }, []);

  const set = <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => setConfig(prev => ({ ...prev, [key]: value }));
  const facts = config.facts ?? [];
  const setFacts = (next: SiteFact[]) => set('facts', next);
  const dirty = JSON.stringify(config) !== JSON.stringify(saved);

  const pickAccent = (accent: AccentPreset) => {
    set('accent', accent);
    applyAccent({ accent });
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImageFile(file);
      set('portraitUrl', url);
      toast.success('Portrait uploaded. Save to publish it.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSave = async (e?: FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const payload = { ...config, facts: facts.filter(f => f.label.trim() && f.value.trim()) };
      const next = await api<SiteConfig>('/api/config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      const merged = { ...EMPTY, ...next };
      setConfig(merged);
      setSaved(merged);
      savedAccent.current = merged.accent ?? 'vermilion';
      loadHome(true).catch(() => undefined);
      toast.success('Published. Changes are live.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-2/3" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="pb-24">
      <AdminPageHeader
        kicker="Site"
        title="Settings"
        description="Everything the homepage shows, from the hero to the about section."
        actions={
          <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground">
            Preview site <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        }
      />

      <Panel index="01 · Hero" title="Introduction" description="The lines under your name on the homepage.">
        <Field id="subtitle" label="Subtitle" hint="Shown after the headline">
          <Input id="subtitle" value={config.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="I love building things." />
        </Field>
        <Field id="bio" label="Bio">
          <Textarea id="bio" value={config.bio} onChange={e => set('bio', e.target.value)} rows={4} />
        </Field>
        <Field id="now" label="Headline" hint="Blank = your latest role, e.g. “Systems Engineer at Cloudflare.”">
          <Input id="now" value={config.now ?? ''} onChange={e => set('now', e.target.value)} placeholder="Systems Engineer at Cloudflare." />
        </Field>
        <Field id="portraitUrl" label="Portrait" hint="Shown in the about section, portrait orientation works best">
          <div className="flex items-center gap-4">
            {config.portraitUrl && <img src={config.portraitUrl} alt="" className="h-16 w-12 shrink-0 border border-border object-cover" />}
            <Input id="portraitUrl" value={config.portraitUrl ?? ''} onChange={e => set('portraitUrl', e.target.value)} placeholder={DEFAULT_SITE_EXTRAS.portraitUrl} />
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => onUpload(e.target.files?.[0])} />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="shrink-0">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Upload</span>
            </Button>
          </div>
        </Field>
      </Panel>

      <Panel index="02 · About" title="About" description="The statement and the facts list in the About section.">
        <Field id="about" label="Statement">
          <Textarea id="about" value={config.about} onChange={e => set('about', e.target.value)} rows={6} />
        </Field>
        <Field id="location" label="Based in" hint="Blank = from your latest role">
          <Input id="location" value={config.location ?? ''} onChange={e => set('location', e.target.value)} placeholder="Austin, TX" />
        </Field>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Facts</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setFacts([...facts, { label: '', value: '' }])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add row
            </Button>
          </div>
          <ul className="divide-y divide-border border border-border">
            {facts.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-foreground">No rows. Name, role and location still show.</li>}
            {facts.map((fact, i) => (
              <li key={i} className="grid grid-cols-[1fr_auto] gap-2 p-2 sm:grid-cols-[11rem_1fr_auto]">
                <Input
                  aria-label="Label"
                  value={fact.label}
                  onChange={e => setFacts(facts.map((f, j) => (j === i ? { ...f, label: e.target.value } : f)))}
                  placeholder="Label"
                  className="font-mono text-xs uppercase tracking-wider"
                />
                <Input
                  aria-label="Value"
                  value={fact.value}
                  onChange={e => setFacts(facts.map((f, j) => (j === i ? { ...f, value: e.target.value } : f)))}
                  placeholder="Value"
                  className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-1 sm:col-start-2"
                />
                <div className="flex items-center gap-0.5 sm:col-start-3 sm:row-start-1">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={i === 0} aria-label="Move up"
                    onClick={() => { const next = [...facts]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; setFacts(next); }}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={i === facts.length - 1} aria-label="Move down"
                    onClick={() => { const next = [...facts]; [next[i + 1], next[i]] = [next[i], next[i + 1]]; setFacts(next); }}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" aria-label="Remove row" onClick={() => setFacts(facts.filter((_, j) => j !== i))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel index="03 · About page" title="The longer story" description="Markdown rendered on /about. Each ## heading becomes a chapter.">
        <Field id="aboutStory" label="Markdown">
          <Textarea id="aboutStory" value={config.aboutStory} onChange={e => set('aboutStory', e.target.value)} rows={22} className="font-mono text-[13px] leading-relaxed" />
        </Field>
      </Panel>

      <Panel index="04 · Appearance" title="Signal colour" description="One accent, used sparingly across the site. Previewed live, applied on save.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {ACCENT_PRESETS.map(key => {
            const swatch = ACCENT_SWATCH[key];
            const active = (config.accent ?? 'vermilion') === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => pickAccent(key)}
                className={cn('group flex flex-col items-start gap-3 border p-3 text-left transition-colors', active ? 'border-foreground' : 'border-border hover:border-muted-foreground')}
                aria-pressed={active}
              >
                <span className="h-10 w-full" style={{ background: swatch.color }} />
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-foreground">{swatch.label}</span>
              </button>
            );
          })}
        </div>
      </Panel>

      <div className={cn('fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md transition-transform duration-500 lg:left-64', dirty ? 'translate-y-0' : 'translate-y-full')}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-10">
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-primary" /> Unsaved changes
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => { setConfig(saved); applyAccent({ accent: saved.accent }); }} disabled={saving}>Discard</Button>
            <Button type="submit" disabled={saving} className="rounded-full px-6">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing…</> : 'Publish'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
