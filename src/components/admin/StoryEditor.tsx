import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { DEFAULT_STORY, SCENE_IDS, type SceneId, type SiteFact, type StoryChapter, type StoryLink } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { SCENE_TONE } from '@/components/site/story';

const SCENE_META: Record<SceneId, { label: string; color: string }> = {
  night: { label: 'Night', color: `hsl(${SCENE_TONE.night})` },
  kernel: { label: 'Kernel (phosphor)', color: `hsl(${SCENE_TONE.kernel})` },
  breach: { label: 'Breach (red alert)', color: `hsl(${SCENE_TONE.breach})` },
  signal: { label: 'Signal (network)', color: `hsl(${SCENE_TONE.signal})` },
  noise: { label: 'Noise (diffusion)', color: `hsl(${SCENE_TONE.noise})` },
  swarm: { label: 'Swarm (agents)', color: `hsl(${SCENE_TONE.swarm})` },
  dawn: { label: 'Dawn', color: `hsl(${SCENE_TONE.dawn})` },
};

const MAX_CHAPTERS = 8;
const MAX_ROWS = 4;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

function newChapter(): StoryChapter {
  return { id: `chapter-${Date.now().toString(36)}`, scene: 'night', era: '', title: '', body: '', highlights: [], links: [] };
}

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function SceneDot({ scene }: { scene: SceneId }) {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: SCENE_META[scene].color, boxShadow: `0 0 10px ${SCENE_META[scene].color}` }} />;
}

function MiniLabel({ htmlFor, children }: { htmlFor?: string; children: string }) {
  return <Label htmlFor={htmlFor} className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{children}</Label>;
}

function RowList<T extends SiteFact | StoryLink>({
  title,
  rows,
  onChange,
  empty,
  fields,
  blank,
}: {
  title: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  empty: string;
  fields: [keyof T & string, string, string][];
  blank: T;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <MiniLabel>{`${title} · ${rows.length}/${MAX_ROWS}`}</MiniLabel>
        <Button type="button" variant="ghost" size="sm" className="h-7" disabled={rows.length >= MAX_ROWS} onClick={() => onChange([...rows, { ...blank }])}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
      <ul className="divide-y divide-border border border-border">
        {rows.length === 0 && <li className="px-4 py-4 text-center text-xs text-muted-foreground">{empty}</li>}
        {rows.map((row, i) => (
          <li key={i} className="grid grid-cols-[1fr_auto] gap-2 p-2 sm:grid-cols-[11rem_1fr_auto]">
            {fields.map(([key, placeholder, className], f) => (
              <Input
                key={key}
                aria-label={placeholder}
                value={String(row[key] ?? '')}
                onChange={e => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: e.target.value } : r)))}
                placeholder={placeholder}
                className={cn(className, f === 1 && 'col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1')}
              />
            ))}
            <Button type="button" variant="ghost" size="icon" className="h-9 w-8 hover:text-destructive sm:col-start-3 sm:row-start-1" aria-label={`Remove ${title.toLowerCase()} row`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChapterCard({
  chapter,
  index,
  count,
  open,
  onToggle,
  onChange,
  onMove,
  onRemove,
}: {
  chapter: StoryChapter;
  index: number;
  count: number;
  open: boolean;
  onToggle: () => void;
  onChange: (next: StoryChapter) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const set = <K extends keyof StoryChapter>(key: K, value: StoryChapter[K]) => onChange({ ...chapter, [key]: value });
  const base = `story-${chapter.id}`;
  const paragraphs = chapter.body.split(/\n\s*\n/).filter(p => p.trim()).length;
  return (
    <li className={cn('border border-border bg-card/40 transition-colors', open && 'border-muted-foreground/40')}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-4 text-left" aria-expanded={open}>
          <span className="w-9 shrink-0 font-mono text-[11px] tracking-[0.14em] text-muted-foreground">{ROMAN[index] ?? index + 1}</span>
          <SceneDot scene={chapter.scene} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-lg leading-tight text-foreground">{chapter.title || 'Untitled chapter'}</span>
            <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {[chapter.era, SCENE_META[chapter.scene].label].filter(Boolean).join(' · ')}
            </span>
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>
        <div className="flex shrink-0 items-center gap-0.5 border-l border-border pl-2">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} aria-label="Move chapter up" onClick={() => onMove(index - 1)}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === count - 1} aria-label="Move chapter down" onClick={() => onMove(index + 1)}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" aria-label="Remove chapter" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {open && (
        <div className="space-y-5 border-t border-border px-4 py-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
            <div className="space-y-2">
              <MiniLabel htmlFor={`${base}-era`}>Era</MiniLabel>
              <Input id={`${base}-era`} value={chapter.era} maxLength={60} onChange={e => set('era', e.target.value)} placeholder="2016 to 2022" />
            </div>
            <div className="space-y-2">
              <MiniLabel htmlFor={`${base}-scene`}>Scene</MiniLabel>
              <Select value={chapter.scene} onValueChange={v => set('scene', v as SceneId)}>
                <SelectTrigger id={`${base}-scene`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCENE_IDS.map(id => (
                    <SelectItem key={id} value={id}>
                      <span className="flex items-center gap-2.5"><SceneDot scene={id} />{SCENE_META[id].label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <MiniLabel htmlFor={`${base}-title`}>Title</MiniLabel>
            <Input id={`${base}-title`} value={chapter.title} maxLength={140} onChange={e => set('title', e.target.value)} placeholder="One hour a day." className="font-display text-base" />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <MiniLabel htmlFor={`${base}-body`}>Body</MiniLabel>
              <span className="text-xs text-muted-foreground/80">Blank line starts a new paragraph · {paragraphs} {paragraphs === 1 ? 'paragraph' : 'paragraphs'}</span>
            </div>
            <Textarea id={`${base}-body`} value={chapter.body} maxLength={4000} onChange={e => set('body', e.target.value)} rows={7} className="font-serif text-[15px] leading-relaxed" />
          </div>
          <RowList
            title="Highlights"
            rows={chapter.highlights}
            onChange={rows => set('highlights', rows)}
            empty="No highlights."
            blank={{ label: '', value: '' }}
            fields={[['label', 'Label', 'font-mono text-xs uppercase tracking-wider'], ['value', 'Value', '']]}
          />
          <RowList
            title="Links"
            rows={chapter.links ?? []}
            onChange={rows => set('links', rows)}
            empty="No links."
            blank={{ label: '', url: '' }}
            fields={[['label', 'Label', ''], ['url', 'https://', 'font-mono text-xs']]}
          />
        </div>
      )}
    </li>
  );
}

export function StoryEditor({ story, onChange }: { story: StoryChapter[]; onChange: (next: StoryChapter[]) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const isDefault = JSON.stringify(story) === JSON.stringify(DEFAULT_STORY);

  const add = () => {
    const chapter = newChapter();
    onChange([...story, chapter]);
    setOpen(chapter.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {story.length}/{MAX_CHAPTERS} chapters{isDefault ? ' · default story' : ''}
        </span>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" disabled={isDefault} onClick={() => { onChange(DEFAULT_STORY.map(c => ({ ...c }))); setOpen(null); }}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset to default story
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={story.length >= MAX_CHAPTERS} onClick={add}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add chapter
          </Button>
        </div>
      </div>
      <ol className="space-y-2">
        {story.length === 0 && (
          <li className="border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No chapters. The homepage falls back to the default story.</li>
        )}
        {story.map((chapter, i) => (
          <ChapterCard
            key={chapter.id}
            chapter={chapter}
            index={i}
            count={story.length}
            open={open === chapter.id}
            onToggle={() => setOpen(open === chapter.id ? null : chapter.id)}
            onChange={next => onChange(story.map((c, j) => (j === i ? next : c)))}
            onMove={to => onChange(move(story, i, to))}
            onRemove={() => onChange(story.filter((_, j) => j !== i))}
          />
        ))}
      </ol>
    </div>
  );
}
