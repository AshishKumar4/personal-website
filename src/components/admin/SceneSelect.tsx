import { SCENE_IDS, type SceneId } from '@shared/types';

const SCENE_LABELS: Record<SceneId, string> = {
  night: 'Night',
  kernel: 'Kernel (amber phosphor)',
  breach: 'Breach (red alert)',
  signal: 'Signal (network)',
  noise: 'Noise (diffusion)',
  swarm: 'Swarm (fireflies)',
  dawn: 'Dawn',
};

export function SceneSelect({ id, value, onChange }: { id: string; value?: SceneId; onChange: (next: SceneId | undefined) => void }) {
  return (
    <select
      id={id}
      value={value ?? ''}
      onChange={e => onChange(e.target.value ? (e.target.value as SceneId) : undefined)}
      className="flex h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">Automatic</option>
      {SCENE_IDS.map(s => (
        <option key={s} value={s}>{SCENE_LABELS[s]}</option>
      ))}
    </select>
  );
}
