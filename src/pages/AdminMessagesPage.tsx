import { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, Mail, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { getToken } from '@/lib/auth';
import type { ContactMessage } from '@shared/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';

export function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ items: ContactMessage[] }>('/api/contacts', { headers: { Authorization: `Bearer ${getToken()}` } });
      setMessages(res.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter(m => `${m.name} ${m.email} ${m.message}`.toLowerCase().includes(q));
  }, [messages, query]);

  const active = filtered.find(m => m.id === selected) ?? filtered[0] ?? null;

  const remove = async (id: string) => {
    try {
      await api(`/api/contacts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selected === id) setSelected(null);
      toast.success('Message deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        kicker="Inbox"
        title="Messages"
        description="Everything sent through the contact form on the homepage."
        actions={
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search messages" className="pl-9" />
          </div>
        }
      />
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          <Skeleton className="h-80 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-border py-24 text-center">
          <Inbox className="mb-4 h-8 w-8 text-muted-foreground" />
          <p className="font-display text-3xl text-foreground">{query ? 'No matches' : 'Inbox zero'}</p>
          <p className="mt-2 text-sm text-muted-foreground">{query ? 'Try a different search.' : 'When someone uses the contact form, it lands here.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
          <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto border border-border bg-card">
            {filtered.map(m => (
              <li key={m.id}>
                <button
                  onClick={() => setSelected(m.id)}
                  className={cn('block w-full px-4 py-3 text-left transition-colors hover:bg-accent', active?.id === m.id && 'bg-accent')}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate font-medium text-foreground">{m.name}</span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">{m.email}</div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{m.message}</p>
                </button>
              </li>
            ))}
          </ul>
          {active && (
            <article className="border border-border bg-card p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
                <div>
                  <h2 className="font-display text-3xl text-foreground">{active.name}</h2>
                  <a href={`mailto:${active.email}`} className="font-mono text-xs text-primary hover:underline">{active.email}</a>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">{new Date(active.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <Button asChild size="sm">
                    <a href={`mailto:${active.email}?subject=${encodeURIComponent('Re: your message on ashishkumarsingh.com')}`}>
                      <Mail className="mr-2 h-4 w-4" /> Reply
                    </a>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" aria-label="Delete message"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this message?</AlertDialogTitle>
                        <AlertDialogDescription>This permanently removes the message from {active.name}.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(active.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <p className="mt-6 whitespace-pre-wrap text-[0.975rem] leading-relaxed text-foreground/90">{active.message}</p>
            </article>
          )}
        </div>
      )}
    </div>
  );
}
