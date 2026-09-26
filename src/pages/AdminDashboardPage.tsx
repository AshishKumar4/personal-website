import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Briefcase, Code, FileText, Inbox, PenLine, Settings, Star } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import { formatCount, loadGitHub, timeAgo } from '@/lib/site-data';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import type { ContactMessage, GitHubSnapshot, HomePayload } from '@shared/types';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function Tile({ label, value, href, icon: Icon, hint }: { label: string; value: ReactNode; href: string; icon: typeof FileText; hint?: string }) {
  return (
    <Link to={href} className="group relative flex flex-col justify-between border border-border bg-card p-5 transition-colors hover:border-primary/50">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
        <Icon className="h-4 w-4 transition-colors group-hover:text-primary" />
      </div>
      <div className="mt-6 font-display text-6xl leading-none tracking-[-0.02em] text-foreground tabular">{value}</div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{hint}</span>
        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </Link>
  );
}

export function AdminDashboardPage() {
  const [home, setHome] = useState<HomePayload | null>(null);
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [github, setGithub] = useState<GitHubSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [h, m] = await Promise.allSettled([
        api<HomePayload>('/api/home'),
        api<{ items: ContactMessage[] }>('/api/contacts', { headers: { Authorization: `Bearer ${getToken()}` } }),
      ]);
      if (!alive) return;
      if (h.status === 'fulfilled') setHome(h.value);
      if (m.status === 'fulfilled') setMessages(m.value.items);
      setLoading(false);
    })();
    loadGitHub().then(g => {
      if (alive) setGithub(g);
    });
    return () => {
      alive = false;
    };
  }, []);

  const stars = github ? Object.values(github.repos).reduce((sum, r) => sum + r.stars, 0) : null;
  const posts = home?.posts ?? [];
  const recentMessages = (messages ?? []).slice(0, 4);

  return (
    <div className="space-y-10">
      <AdminPageHeader
        kicker="Control room"
        title={`${greeting()}.`}
        description="Everything the public site samples from lives here. Changes go live on save."
        actions={
          <Link
            to="/admin/posts/new"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 font-mono text-[11px] uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90"
          >
            <PenLine className="h-3.5 w-3.5" /> New post
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4 [&>*]:border-0">
        {loading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-none" />)
        ) : (
          <>
            <Tile label="Posts" value={posts.length} href="/admin/posts" icon={FileText} hint={posts[0] ? `latest ${timeAgo(posts[0].createdAt)}` : 'none yet'} />
            <Tile label="Projects" value={home?.projects.length ?? 0} href="/admin/projects" icon={Code} hint={stars !== null ? `${formatCount(stars)} stars total` : 'samples on the homepage'} />
            <Tile label="Experience" value={home?.experiences.length ?? 0} href="/admin/experience" icon={Briefcase} hint="checkpoints in the training run" />
            <Tile label="Messages" value={messages?.length ?? 0} href="/admin/messages" icon={Inbox} hint={messages?.[0] ? `last ${timeAgo(messages[0].createdAt)}` : 'inbox zero'} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="border border-border bg-card lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Recent messages</h2>
            <Link to="/admin/messages" className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary hover:underline">Open inbox</Link>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : recentMessages.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No messages yet. The contact form will fill this up.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recentMessages.map(m => (
                <li key={m.id}>
                  <Link to="/admin/messages" className="block px-5 py-3.5 transition-colors hover:bg-accent/50">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-foreground">{m.name}</span>
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{timeAgo(m.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{m.message}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border border-border bg-card lg:col-span-2">
          <div className="border-b border-border px-5 py-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Telemetry · GitHub</h2>
          </div>
          <dl className="divide-y divide-border text-sm">
            {[
              ['Stars on featured repos', stars !== null ? formatCount(stars) : '—'],
              ['Followers', github?.user ? String(github.user.followers) : '—'],
              ['Public repos', github?.user ? String(github.user.publicRepos) : '—'],
              ['Last push', github?.lastPush ? `${github.lastPush.repo.split('/')[1]} · ${timeAgo(github.lastPush.at)}` : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-5 py-3">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-mono text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-border px-5 py-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
            Cached at the edge for an hour. Set a GITHUB_TOKEN secret to raise the API rate limit.
          </p>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="border border-border bg-card lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Recent posts</h2>
            <Link to="/admin/posts" className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary hover:underline">All posts</Link>
          </div>
          <ul className="divide-y divide-border">
            {posts.slice(0, 5).map(p => (
              <li key={p.slug} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <Link to={`/admin/posts/${p.slug}/edit`} className="block truncate text-sm font-medium text-foreground hover:text-primary">{p.title}</Link>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {p.format === 'notebook' ? 'notebook' : `${p.readingTime} min`}
                    {p.featured && <span className="ml-2 text-primary">featured</span>}
                  </div>
                </div>
                <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground" aria-label={`View ${p.title}`}>
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </li>
            ))}
            {!loading && posts.length === 0 && <li className="px-5 py-10 text-center text-sm text-muted-foreground">No posts yet.</li>}
          </ul>
        </section>

        <section className="border border-border bg-card lg:col-span-2">
          <div className="border-b border-border px-5 py-3">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Quick actions</h2>
          </div>
          <ul className="divide-y divide-border text-sm">
            {[
              ['Write a post', '/admin/posts/new', PenLine],
              ['Add a project', '/admin/projects', Code],
              ['Add experience', '/admin/experience', Briefcase],
              ['Edit hero, prompt and accent', '/admin/settings', Settings],
              ['Check stars on the homepage', '/#projects', Star],
            ].map(([label, href, Icon]) => {
              const I = Icon as typeof FileText;
              const external = (href as string).startsWith('/#');
              return (
                <li key={label as string}>
                  {external ? (
                    <a href={href as string} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-5 py-3 text-foreground transition-colors hover:bg-accent/50">
                      <span className="flex items-center gap-3"><I className="h-4 w-4 text-muted-foreground" />{label as string}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  ) : (
                    <Link to={href as string} className="flex items-center justify-between px-5 py-3 text-foreground transition-colors hover:bg-accent/50">
                      <span className="flex items-center gap-3"><I className="h-4 w-4 text-muted-foreground" />{label as string}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
