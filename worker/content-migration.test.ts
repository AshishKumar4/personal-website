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
  test('leads with Kinu, VibeSDK, Dew and do86 and drops retired projects', () => {
    const ids = [...SEED_PROJECTS].sort((a, b) => a.order! - b.order!).map((p) => p.id);
    expect(ids.slice(0, 4)).toEqual(['kinu', 'cloudflare-vibesdk', 'dew', 'do86']);
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
    expect(plan.deleteIds.sort()).toEqual(['ashishkumar4-cf-git', 'mossaic']);
    expect(plan.add.map((p) => p.id)).toEqual(['kinu', 'dew']);
    expect(plan.orders).toContainEqual({ id: 'cloudflare-vibesdk', order: 2 });
    expect(plan.orders).toContainEqual({ id: 'do86', order: 4 });
    expect(plan.orders.map((o) => o.id)).not.toContain('mossaic');
    expect(plan.orders.map((o) => o.id)).not.toContain('kinu');
  });

  test('fills missing years without touching ones the admin set', () => {
    const plan = planProjectsMigration([project('ashishkumar4-aqeous'), project('do86', { year: '2025-01' })], PROJECTS_MIGRATION);
    expect(plan.years).toEqual([{ id: 'ashishkumar4-aqeous', year: '2015-12' }]);
  });
  test('fills missing stories without touching ones the admin wrote', () => {
    const plan = planProjectsMigration([project('do86'), project('nimbus', { story: 'Mine.' })], PROJECTS_MIGRATION);
    expect(plan.stories.map((s) => s.id)).toContain('do86');
    expect(plan.stories.map((s) => s.id)).not.toContain('nimbus');
  });
  test('replaces retired default stories but keeps ones the admin wrote', () => {
    const retired = 'do86 runs x86 operating systems inside a Cloudflare Durable Object, with guest memory paged in from SQLite. It boots Aqeous, the kernel I wrote at 15.';
    const plan = planProjectsMigration([project('do86', { story: retired }), project('nimbus', { story: 'Mine.' })], PROJECTS_MIGRATION);
    expect(plan.stories.map((s) => s.id)).toContain('do86');
    expect(plan.stories.map((s) => s.id)).not.toContain('nimbus');
  });
  test('keeps explicit admin ordering', () => {
    const plan = planProjectsMigration([project('do86', { order: 0 }), project('nimbus')], PROJECTS_MIGRATION);
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
    expect(planProjectsMigration(after, PROJECTS_MIGRATION)).toEqual({ deleteIds: [], add: [], orders: [], years: [], stories: [] });
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
    expect(store.sorted()).toEqual(['kinu', 'cloudflare-vibesdk', 'dew', 'do86', 'nimbus', 'ashishkumar4-flaxdiff', 'flydreamer', 'ashishkumar4-aqeous']);
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
    expect(store.sorted().slice(0, 4)).toEqual(['kinu', 'cloudflare-vibesdk', 'dew', 'do86']);
  });

  test('is safe to execute twice after a crashed claim', async () => {
    const store = new MemoryStore(LIVE_IDS.map((id) => project(id)));
    store.marker = claimMarker(EMPTY_MIGRATION_MARKER, 'crashed', 0);
    await store.deleteProject('mossaic');
    await store.addProjectIfAbsent(SEED_PROJECTS[0]);
    expect(await runProjectsMigration(store, PROJECTS_MIGRATION, () => 10_000)).toBe('busy');
    expect(await runProjectsMigration(store, PROJECTS_MIGRATION, () => 120_000)).toBe('applied');
    expect(store.sorted()).toEqual(['kinu', 'cloudflare-vibesdk', 'dew', 'do86', 'nimbus', 'ashishkumar4-flaxdiff', 'flydreamer', 'ashishkumar4-aqeous']);
  });

  test('does not clobber an order the admin sets mid-flight', async () => {
    const store = new MemoryStore(LIVE_IDS.map((id) => project(id)));
    const original = store.setOrderIfUnset.bind(store);
    store.setOrderIfUnset = async (id, order) => {
      if (id === 'do86') store.docs.set('do86', { ...store.docs.get('do86')!, order: 0 });
      return original(id, order);
    };
    await runProjectsMigration(store);
    expect(store.docs.get('do86')!.order).toBe(0);
    expect(store.sorted()[0]).toBe('do86');
  });
});
