import { api } from '@/lib/api-client';
import type { GitHubSnapshot, HomePayload, RepoStats, SiteConfig } from '@shared/types';

let homePromise: Promise<HomePayload> | null = null;
let githubPromise: Promise<GitHubSnapshot | null> | null = null;
let homeValue: HomePayload | null = null;

export function loadHome(force = false): Promise<HomePayload> {
  if (!homePromise || force) {
    homePromise = api<HomePayload>('/api/home')
      .then(data => {
        homeValue = data;
        applyAccent(data.config);
        return data;
      })
      .catch(err => {
        homePromise = null;
        throw err;
      });
  }
  return homePromise;
}

export function peekHome(): HomePayload | null {
  return homeValue;
}

export function loadGitHub(): Promise<GitHubSnapshot | null> {
  if (!githubPromise) {
    githubPromise = api<GitHubSnapshot>('/api/github').catch(() => null);
  }
  return githubPromise;
}

export function repoStats(snapshot: GitHubSnapshot | null, repo: string): RepoStats | null {
  if (!snapshot || !repo) return null;
  return snapshot.repos[repo.trim().toLowerCase()] ?? null;
}

export function applyAccent(config: Pick<SiteConfig, 'accent'> | null) {
  const accent = config?.accent;
  const root = document.documentElement;
  if (!accent || accent === 'vermilion') root.removeAttribute('data-accent');
  else root.setAttribute('data-accent', accent);
  try {
    if (!accent || accent === 'vermilion') localStorage.removeItem('accent');
    else localStorage.setItem('accent', accent);
  } catch {
    return;
  }
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`;
  return String(n);
}

export function timeAgo(iso: string | number): string {
  const then = typeof iso === 'number' ? iso : Date.parse(iso);
  const s = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 60) return `${d}d ago`;
  return `${Math.round(d / 30)}mo ago`;
}

export function yearsFromDuration(duration: string): { start: number | null; end: number | null; current: boolean } {
  const years = [...duration.matchAll(/(19|20)\d{2}/g)].map(m => Number(m[0]));
  const current = /present|now|current/i.test(duration);
  return { start: years[0] ?? null, end: current ? null : (years[1] ?? years[0] ?? null), current };
}

export function shortDuration(duration: string): string {
  return duration.split('·')[0].trim();
}
