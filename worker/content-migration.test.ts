import { expect, test, describe } from 'bun:test';
import type { Project } from '@shared/types';
import {
  SEED_PROJECTS,
  PROJECTS_MIGRATION,
  EMPTY_MIGRATION_MARKER,
  planProjectsMigration,
  claimMarker,
  finishMarker,
  runProjectsMigration,
  isReplaceableField,
  type MigrationMarker,
  type ProjectsMigrationStore,
} from './content-migration';

const project = (id: string, extra: Partial<Project> = {}): Project => ({
  id,
  name: id,
  description: '',
  repo: `AshishKumar4/${id}`,
  url: `https://github.com/AshishKumar4/${id}`,
  ...extra,
});

const LIVE_IDS = ['ashishkumar4-aqeous', 'ashishkumar4-cf-git', 'ashishkumar4-flaxdiff', 'cloudflare-vibesdk', 'do86', 'flydreamer', 'mossaic', 'nimbus'];

class MemoryStore implements ProjectsMigrationStore {
  marker: MigrationMarker = { ...EMPTY_MIGRATION_MARKER };
  docs = new Map<string, Project>();
  index = new Set<string>();
  writes = 0;
  constructor(projects: Project[]) {
    for (const p of projects) {
      this.docs.set(p.id, p);
      this.index.add(p.id);
    }
  }
  private tick() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }
  async readMarker() {
    await this.tick();
    return this.marker;
  }
  async updateMarker(fn: (current: MigrationMarker) => MigrationMarker) {
    await this.tick();
    this.marker = fn(this.marker);
    return this.marker;
  }
  async listProjects() {
    await this.tick();
    return [...this.index].map((id) => this.docs.get(id) ?? { ...project(id), name: '' });
  }
  async deleteProject(id: string) {
    await this.tick();
    this.writes++;
    this.docs.delete(id);
    this.index.delete(id);
  }
  async addProjectIfAbsent(p: Project) {
    await this.tick();
    this.writes++;
    if (!this.docs.get(p.id)?.name) this.docs.set(p.id, p);
    this.index.add(p.id);
  }
  experienceStories = new Map<string, string>();
  async setStoryIfUnset(id: string, story: string) {
    await this.tick();
    const current = this.docs.get(id);
    if (!current || current.story?.trim()) return;
    this.docs.set(id, { ...current, story });
  }
  async setExperienceStoryIfUnset(id: string, story: string) {
    await this.tick();
    if (!this.experienceStories.has(id)) this.experienceStories.set(id, story);
  }
  async setYearIfUnset(id: string, year: string) {
    await this.tick();
    const current = this.docs.get(id);
    if (!current || current.year) return;
    this.docs.set(id, { ...current, year });
  }
  async setFieldIfReplaceable(id: string, field: 'homepage' | 'imageUrl' | 'videoUrl', value: string, retired: string[]) {
    await this.tick();
    const current = this.docs.get(id);
    if (!current || !isReplaceableField(current[field], retired)) return;
    this.writes++;
    this.docs.set(id, { ...current, [field]: value });
  }
  async setOrderIfUnset(id: string, order: number) {
    await this.tick();
    const current = this.docs.get(id);
    if (!current || typeof current.order === 'number') return;
    this.writes++;
    this.docs.set(id, { ...current, order });
  }
  sorted() {
    return [...this.index].map((id) => this.docs.get(id)!).sort((a, b) => (a.order ?? 99) - (b.order ?? 99)).map((p) => p.id);
  }
}

describe('SEED_PROJECTS', () => {
  test('leads with Kinu, VibeSDK, Dew and Nimbus and drops retired projects', () => {
    const ids = [...SEED_PROJECTS].sort((a, b) => a.order! - b.order!).map((p) => p.id);
    expect(ids.slice(0, 4)).toEqual(['kinu', 'cloudflare-vibesdk', 'dew', 'nimbus']);
    expect(ids).not.toContain('do86');
    expect(ids).not.toContain('mossaic');
    expect(ids).not.toContain('ashishkumar4-cf-git');
    expect(ids).not.toContain('cloudflare-vibesdk-templates');
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of SEED_PROJECTS) {
      expect(p.url === '' || p.url.startsWith('https://github.com/')).toBe(true);
      expect(p.description).not.toContain('—');
    }
  });
});

describe('planProjectsMigration', () => {
  test('plans deletes, additions and orders against the live project list', () => {
    const plan = planProjectsMigration(LIVE_IDS.map((id) => project(id)), PROJECTS_MIGRATION);
    expect(plan.deleteIds.sort()).toEqual(['ashishkumar4-cf-git', 'do86', 'mossaic']);
    expect(plan.add.map((p) => p.id)).toEqual(['kinu', 'dew']);
    expect(plan.orders).toContainEqual({ id: 'cloudflare-vibesdk', order: 2 });
    expect(plan.orders).toContainEqual({ id: 'nimbus', order: 5 });
    expect(plan.orders.map((o) => o.id)).not.toContain('do86');
    expect(plan.orders.map((o) => o.id)).not.toContain('mossaic');
    expect(plan.orders.map((o) => o.id)).not.toContain('kinu');
  });

  test('fills missing years without touching ones the admin set', () => {
    const plan = planProjectsMigration([project('ashishkumar4-aqeous'), project('flydreamer', { year: '2025-01' })], PROJECTS_MIGRATION);
    expect(plan.years).toEqual([{ id: 'ashishkumar4-aqeous', year: '2015-12' }]);
  });
  test('fills missing stories without touching ones the admin wrote', () => {
    const plan = planProjectsMigration([project('flydreamer'), project('nimbus', { story: 'Mine.' })], PROJECTS_MIGRATION);
    expect(plan.stories.map((s) => s.id)).toContain('flydreamer');
    expect(plan.stories.map((s) => s.id)).not.toContain('nimbus');
  });
  test('replaces retired default stories but keeps ones the admin wrote', () => {
    const retired = "Lately I've been trying to teach a DreamerV3 style world model agent to fly an FPV drone from vision alone, inside simulation environments I built for it. I build and fly FPV drones myself, so this one is a bit personal. Reward shaping is humbling tbh.";
    const plan = planProjectsMigration([project('flydreamer', { story: retired }), project('nimbus', { story: 'Mine.' })], PROJECTS_MIGRATION);
    expect(plan.stories.map((s) => s.id)).toContain('flydreamer');
    expect(plan.stories.map((s) => s.id)).not.toContain('nimbus');
  });
  test('replaces the retired FlaxDiff flowers and fills media where unset', () => {
    const plan = planProjectsMigration(
      [
        project('ashishkumar4-flaxdiff', { imageUrl: '/api/images/images/projects/flaxdiff.jpg' }),
        project('nimbus', { imageUrl: '/api/images/images/projects/nimbus.png' }),
        project('flydreamer', { imageUrl: '/api/images/images/projects/flydreamer.png' }),
        project('kinu', { imageUrl: '/projects/kinu.webp' }),
        project('dew'),
      ],
      PROJECTS_MIGRATION,
    );
    const set = (id: string, field: string) => plan.fields.find((f) => f.id === id && f.field === field)?.value;
    expect(set('dew', 'imageUrl')).toBe('/projects/dew.svg');
    expect(set('ashishkumar4-flaxdiff', 'imageUrl')).toBe('/projects/flaxdiff.webp');
    expect(set('nimbus', 'imageUrl')).toBe('/projects/nimbus.webp');
    expect(set('flydreamer', 'imageUrl')).toBe('/projects/flydreamer.webp');
    expect(set('flydreamer', 'videoUrl')).toBe('/projects/flydreamer.webm /projects/flydreamer.mp4');
    expect(set('kinu', 'imageUrl')).toBe('/projects/kinu-landing.webp');
    expect(set('kinu', 'homepage')).toBe('https://kinu.run');
    expect(set('ashishkumar4-flaxdiff', 'homepage')).toBe('https://pypi.org/project/flaxdiff/');
  });

  test('never overwrites media or live sites the admin set', () => {
    const plan = planProjectsMigration(
      [
        project('ashishkumar4-flaxdiff', { imageUrl: '/api/images/images/mine.png' }),
        project('flydreamer', { videoUrl: '/mine.mp4' }),
        project('kinu', { homepage: 'https://example.com' }),
        project('cloudflare-vibesdk', { imageUrl: '/api/images/images/projects/vibesdk.png' }),
      ],
      PROJECTS_MIGRATION,
    );
    const touched = plan.fields.map((f) => `${f.id}.${f.field}`);
    expect(touched).not.toContain('ashishkumar4-flaxdiff.imageUrl');
    expect(touched).not.toContain('flydreamer.videoUrl');
    expect(touched).not.toContain('kinu.homepage');
    expect(touched).not.toContain('cloudflare-vibesdk.imageUrl');
    expect(touched).toContain('cloudflare-vibesdk.homepage');
  });

  test('keeps explicit admin ordering', () => {
    const plan = planProjectsMigration([project('flydreamer', { order: 0 }), project('nimbus')], PROJECTS_MIGRATION);
    expect(plan.orders).toEqual([{ id: 'nimbus', order: 5 }]);
  });

  test('does not re-add projects that already exist', () => {
    const kinu = project('kinu', { description: 'owner copy' });
    const plan = planProjectsMigration([kinu], PROJECTS_MIGRATION);
    expect(plan.add.map((p) => p.id)).toEqual(['dew']);
    expect(plan.orders).toEqual([{ id: 'kinu', order: 1 }]);
  });

  test('is a no-op once applied', () => {
    const after = SEED_PROJECTS.map((p) => ({ ...p }));
    expect(planProjectsMigration(after, PROJECTS_MIGRATION)).toEqual({ deleteIds: [], add: [], orders: [], years: [], stories: [], fields: [] });
  });

  test('restores index entries that point at missing documents', () => {
    const plan = planProjectsMigration([{ ...project('kinu'), name: '' }], PROJECTS_MIGRATION);
    expect(plan.add.map((p) => p.id)).toContain('kinu');
  });
});

describe('migration marker', () => {
  test('claims a pending marker', () => {
    const next = claimMarker(EMPTY_MIGRATION_MARKER, 'a', 1000);
    expect(next).toMatchObject({ status: 'running', claimId: 'a', claimedAt: 1000 });
  });

  test('respects a live lease and takes over a stale one', () => {
    const running = claimMarker(EMPTY_MIGRATION_MARKER, 'a', 1000);
    expect(claimMarker(running, 'b', 2000, 60_000).claimId).toBe('a');
    expect(claimMarker(running, 'b', 70_000, 60_000).claimId).toBe('b');
  });

  test('never reopens a finished marker', () => {
    const done = finishMarker(claimMarker(EMPTY_MIGRATION_MARKER, 'a', 1000), 2000);
    expect(claimMarker(done, 'b', 999_999)).toBe(done);
    expect(finishMarker(done, 5000)).toBe(done);
  });
});

describe('runProjectsMigration', () => {
  test('migrates production content in one pass', async () => {
    const store = new MemoryStore(LIVE_IDS.map((id) => project(id)));
    expect(await runProjectsMigration(store)).toBe('applied');
    expect(store.sorted()).toEqual(['kinu', 'cloudflare-vibesdk', 'dew', 'nimbus', 'ashishkumar4-flaxdiff', 'flydreamer', 'ashishkumar4-aqeous']);
    expect(store.marker.status).toBe('done');
  });

  test('runs only once, even if the admin re-adds a removed project', async () => {
    const store = new MemoryStore(LIVE_IDS.map((id) => project(id)));
    await runProjectsMigration(store);
    await store.addProjectIfAbsent(project('mossaic'));
    await store.deleteProject('kinu');
    const writes = store.writes;
    expect(await runProjectsMigration(store)).toBe('already-done');
    expect(store.writes).toBe(writes);
    expect(store.index.has('mossaic')).toBe(true);
    expect(store.index.has('kinu')).toBe(false);
  });

  test('lets exactly one of many concurrent requests do the work', async () => {
    const store = new MemoryStore(LIVE_IDS.map((id) => project(id)));
    let n = 0;
    const outcomes = await Promise.all(
      Array.from({ length: 12 }, () => runProjectsMigration(store, PROJECTS_MIGRATION, () => 1000, () => `claim-${n++}`)),
    );
    expect(outcomes.filter((o) => o === 'applied')).toHaveLength(1);
    expect(outcomes.every((o) => o === 'applied' || o === 'busy' || o === 'already-done')).toBe(true);
    expect(store.sorted().slice(0, 4)).toEqual(['kinu', 'cloudflare-vibesdk', 'dew', 'nimbus']);
  });

  test('is safe to execute twice after a crashed claim', async () => {
    const store = new MemoryStore(LIVE_IDS.map((id) => project(id)));
    store.marker = claimMarker(EMPTY_MIGRATION_MARKER, 'crashed', 0);
    await store.deleteProject('mossaic');
    await store.addProjectIfAbsent(SEED_PROJECTS[0]);
    expect(await runProjectsMigration(store, PROJECTS_MIGRATION, () => 10_000)).toBe('busy');
    expect(await runProjectsMigration(store, PROJECTS_MIGRATION, () => 120_000)).toBe('applied');
    expect(store.sorted()).toEqual(['kinu', 'cloudflare-vibesdk', 'dew', 'nimbus', 'ashishkumar4-flaxdiff', 'flydreamer', 'ashishkumar4-aqeous']);
  });

  test('moves production media to the new assets without touching other images', async () => {
    const live = LIVE_IDS.map((id) =>
      project(id, ['ashishkumar4-flaxdiff', 'nimbus', 'flydreamer', 'do86', 'cloudflare-vibesdk'].includes(id) ? { imageUrl: `/api/images/images/projects/${id === 'ashishkumar4-flaxdiff' ? 'flaxdiff.jpg' : id === 'cloudflare-vibesdk' ? 'vibesdk.png' : `${id}.png`}` } : {}),
    );
    const store = new MemoryStore(live);
    await runProjectsMigration(store);
    expect(store.docs.get('ashishkumar4-flaxdiff')!.imageUrl).toBe('/projects/flaxdiff.webp');
    expect(store.docs.get('nimbus')!.imageUrl).toBe('/projects/nimbus.webp');
    expect(store.docs.get('flydreamer')!.videoUrl).toBe('/projects/flydreamer.webm /projects/flydreamer.mp4');
    expect(store.docs.get('kinu')!.imageUrl).toBe('/projects/kinu-landing.webp');
    expect(store.index.has('do86')).toBe(false);
    expect(store.docs.get('cloudflare-vibesdk')!.imageUrl).toBe('/api/images/images/projects/vibesdk.png');
    expect(store.docs.get('cloudflare-vibesdk')!.homepage).toBe('https://build.cloudflare.dev');
    expect(store.docs.get('ashishkumar4-aqeous')!.homepage).toBeUndefined();
  });

  test('does not clobber media the admin sets mid-flight', async () => {
    const store = new MemoryStore(LIVE_IDS.map((id) => project(id, id === 'nimbus' ? { imageUrl: '/api/images/images/projects/nimbus.png' } : {})));
    const original = store.setFieldIfReplaceable.bind(store);
    store.setFieldIfReplaceable = async (id, field, value, retired) => {
      if (id === 'nimbus' && field === 'imageUrl') store.docs.set('nimbus', { ...store.docs.get('nimbus')!, imageUrl: '/mine.png' });
      return original(id, field, value, retired);
    };
    await runProjectsMigration(store);
    expect(store.docs.get('nimbus')!.imageUrl).toBe('/mine.png');
  });

  test('does not clobber an order the admin sets mid-flight', async () => {
    const store = new MemoryStore(LIVE_IDS.map((id) => project(id)));
    const original = store.setOrderIfUnset.bind(store);
    store.setOrderIfUnset = async (id, order) => {
      if (id === 'flydreamer') store.docs.set('flydreamer', { ...store.docs.get('flydreamer')!, order: 0 });
      return original(id, order);
    };
    await runProjectsMigration(store);
    expect(store.docs.get('flydreamer')!.order).toBe(0);
    expect(store.sorted()[0]).toBe('flydreamer');
  });
});
