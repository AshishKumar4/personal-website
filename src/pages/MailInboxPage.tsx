import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Outlet, useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import {
  RefreshCw, Search, MoreVertical, Archive, Trash2, ShieldOff, X, SearchX, Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThreadList } from '@/components/mail/ThreadList';
import { DraftList } from '@/components/mail/DraftList';
import { ComposeDialog } from '@/components/mail/ComposeDialog';
import { api } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-utils';
import { API_ENDPOINTS, MAIL_ROUTES, LABEL_ICONS } from '@/lib/mail-constants';
import { useMailContext } from '@/contexts/MailContext';
import { useThreadActions } from '@/hooks/useThreadActions';
import { cn } from '@/lib/utils';
import type { EmailThread, EmailDraft } from '@shared/types';

const LABEL_EMPTY_COPY: Record<string, string> = {
  inbox: 'Inbox zero — nice.',
  sent: 'No sent mail yet',
  starred: 'No starred mail',
  important: 'Nothing marked important',
  trash: 'Trash is empty',
  spam: 'Nothing in spam',
};

export function MailInboxPage() {
  const { label = 'inbox', feedId, threadId } = useParams();
  const navigate = useNavigate();
  const { selectedAccount, addresses, feeds, loading: contextLoading } = useMailContext();
  const { updateThread, trashThread, archiveThread, spamThread, unblockSender } = useThreadActions();

  const feed = feedId ? feeds.find((f) => f.id === feedId) : undefined;
  const isDraftsView = !feedId && label === 'drafts';

  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [editingDraft, setEditingDraft] = useState<EmailDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  const buildThreadPath = useCallback(
    (tid: string) => (feedId ? MAIL_ROUTES.FEED_THREAD(feedId, tid) : MAIL_ROUTES.THREAD(label, tid)),
    [feedId, label]
  );

  const fetchThreads = useCallback(async (silent = false) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!silent) setLoading(true);
    setError(null);
    setSearchActive(false);
    try {
      if (isDraftsView) {
        const params = new URLSearchParams();
        if (selectedAccount) params.append('account', selectedAccount);
        const res = await api<{ items: EmailDraft[] }>(`${API_ENDPOINTS.DRAFTS}?${params.toString()}`);
        if (!controller.signal.aborted) setDrafts(res.items);
      } else {
        const params = new URLSearchParams();
        if (feedId) {
          params.append('feed', feedId);
          params.append('label', 'all');
        } else {
          params.append('label', label);
          if (selectedAccount) params.append('account', selectedAccount);
        }
        const res = await api<{ items: EmailThread[] }>(`${API_ENDPOINTS.THREADS}?${params.toString()}`);
        if (!controller.signal.aborted) setThreads(res.items);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error('Failed to fetch mail:', err);
        setError('Failed to load emails');
        if (!silent) toast.error('Failed to load emails');
      }
    } finally {
      if (!controller.signal.aborted && !silent) {
        setLoading(false);
      }
    }
  }, [label, feedId, isDraftsView, selectedAccount]);

  useEffect(() => {
    fetchThreads();
    setSelectedThreads(new Set());
    setSearchQuery('');
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchThreads]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchThreads();
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams({ q: searchQuery });
      if (selectedAccount) params.append('account', selectedAccount);
      const res = await api<{ items: EmailThread[] }>(`${API_ENDPOINTS.SEARCH}?${params.toString()}`);
      if (!controller.signal.aborted) {
        setThreads(res.items);
        setSearchActive(true);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error('Search failed:', err);
        toast.error('Search failed');
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    if (searchActive) fetchThreads();
  };

  const removeThreadFromList = (id: string) => {
    setThreads((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleStar = async (id: string, starred: boolean) => {
    const previous = threads;
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, starred } : t)));
    try {
      await updateThread(id, { starred });
    } catch (err) {
      console.error('Failed to update thread:', err);
      setThreads(previous);
      toast.error('Failed to update');
    }
  };

  const handleToggleRead = async (thread: EmailThread) => {
    const previous = threads;
    setThreads((prev) => prev.map((t) => (t.id === thread.id ? { ...t, read: !thread.read } : t)));
    try {
      await updateThread(thread.id, { read: !thread.read });
    } catch (err) {
      console.error('Failed to update thread:', err);
      setThreads(previous);
      toast.error('Failed to update');
    }
  };

  const handleArchive = async (thread: EmailThread) => {
    removeThreadFromList(thread.id);
    try {
      await archiveThread(thread);
      toast.success('Archived');
      fetchThreads(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
      fetchThreads(true);
    }
  };

  const handleTrash = async (thread: EmailThread) => {
    removeThreadFromList(thread.id);
    try {
      await trashThread(thread.id);
      toast.success('Moved to trash');
      fetchThreads(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
      fetchThreads(true);
    }
  };

  const handleSpam = async (thread: EmailThread) => {
    removeThreadFromList(thread.id);
    try {
      const result = await spamThread(thread.id);
      if (result.blockedSenders.length > 0) {
        toast.success(
          `Marked as spam — blocked ${result.blockedSenders.join(', ')}`,
          {
            action: {
              label: 'Unblock',
              onClick: () => {
                Promise.all(result.blockedSenders.map((s) => unblockSender(s)))
                  .then(() => toast.success('Sender unblocked'))
                  .catch(() => toast.error('Failed to unblock'));
              },
            },
          }
        );
      } else {
        toast.success('Marked as spam');
      }
      fetchThreads(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
      fetchThreads(true);
    }
  };

  const handleDeleteDraft = async (draft: EmailDraft) => {
    try {
      await api(API_ENDPOINTS.DRAFT(draft.id), { method: 'DELETE' });
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
      toast.success('Draft deleted');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleBulkAction = async (action: 'trash' | 'archive' | 'read' | 'unread' | 'spam') => {
    if (selectedThreads.size === 0) return;
    const selected = threads.filter((t) => selectedThreads.has(t.id));

    const results = await Promise.allSettled(
      selected.map((thread) => {
        if (action === 'trash') return trashThread(thread.id);
        if (action === 'archive') return archiveThread(thread);
        if (action === 'spam') return spamThread(thread.id);
        return updateThread(thread.id, { read: action === 'read' });
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (failed === 0) {
      toast.success(`${succeeded} ${succeeded === 1 ? 'thread' : 'threads'} updated`);
    } else if (succeeded > 0) {
      toast.warning(`${succeeded} updated, ${failed} failed`);
    } else {
      toast.error('All actions failed');
    }

    setSelectedThreads(new Set());
    fetchThreads();
  };

  const moveSelection = (delta: number) => {
    if (isDraftsView || threads.length === 0) return;
    const currentIndex = threadId ? threads.findIndex((t) => t.id === threadId) : -1;
    const nextIndex = Math.max(0, Math.min(threads.length - 1, currentIndex + delta));
    const target = threads[nextIndex];
    if (target) navigate(buildThreadPath(target.id));
  };

  useHotkeys('j', () => moveSelection(1), { preventDefault: true }, [threads, threadId, isDraftsView]);
  useHotkeys('k', () => moveSelection(-1), { preventDefault: true }, [threads, threadId, isDraftsView]);
  useHotkeys('e', () => {
    const current = threads.find((t) => t.id === threadId);
    if (current) handleArchive(current);
  }, { enabled: !!threadId }, [threads, threadId]);

  const emptyState = (() => {
    if (searchActive) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <SearchX className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm">No results for &ldquo;{searchQuery}&rdquo;</p>
          <Button variant="outline" size="sm" onClick={clearSearch}>
            Clear search
          </Button>
        </div>
      );
    }
    if (feed) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 px-8 text-center">
          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: feed.color || 'hsl(var(--primary))' }} />
          <p className="text-sm">
            No mail in {feed.name} yet — mail to its addresses or from its senders will appear here
          </p>
        </div>
      );
    }
    const Icon = LABEL_ICONS[label] || Inbox;
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Icon className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm">{LABEL_EMPTY_COPY[label] || `No emails in ${label}`}</p>
      </div>
    );
  })();

  const hasThreadView = !!threadId;
  const showAccountChip = !selectedAccount || Boolean(feedId);

  return (
    <div className="flex-1 flex overflow-hidden">
      <div
        className={cn(
          'flex-col',
          hasThreadView
            ? 'hidden lg:flex lg:w-[26rem] lg:shrink-0 border-r border-border'
            : 'flex flex-1'
        )}
      >
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
          {!isDraftsView && (
            <Checkbox
              aria-label="Select all"
              checked={selectedThreads.size === threads.length && threads.length > 0}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedThreads(new Set(threads.map((t) => t.id)));
                } else {
                  setSelectedThreads(new Set());
                }
              }}
            />
          )}

          {selectedThreads.size > 0 ? (
            <>
              <Button variant="ghost" size="icon" aria-label="Archive selected" onClick={() => handleBulkAction('archive')}>
                <Archive className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Trash selected" onClick={() => handleBulkAction('trash')}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Mark selected as spam" onClick={() => handleBulkAction('spam')}>
                <ShieldOff className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="More actions">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleBulkAction('read')}>
                    Mark as read
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction('unread')}>
                    Mark as unread
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <span className="text-sm text-muted-foreground ml-2">
                {selectedThreads.size} selected
              </span>
            </>
          ) : (
            <>
              {feed && (
                <span className="flex items-center gap-2 text-sm font-medium shrink-0 max-w-40">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: feed.color || 'hsl(var(--primary))' }}
                  />
                  <span className="truncate">{feed.name}</span>
                </span>
              )}
              <Button variant="ghost" size="icon" aria-label="Refresh" onClick={() => fetchThreads()}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
              {!isDraftsView && (
                <form onSubmit={handleSearch} className="flex-1 flex">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="mail-search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.currentTarget.blur();
                          clearSearch();
                        }
                      }}
                      placeholder="Search emails..."
                      className="pl-8 pr-8"
                      autoComplete="off"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        aria-label="Clear search"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={clearSearch}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {isDraftsView ? (
          contextLoading || loading ? (
            <div className="flex-1" />
          ) : (
            <DraftList drafts={drafts} onOpen={setEditingDraft} onDelete={handleDeleteDraft} />
          )
        ) : (
          <ThreadList
            threads={threads}
            loading={loading}
            error={error}
            empty={emptyState}
            onRetry={() => fetchThreads()}
            buildThreadPath={buildThreadPath}
            showAccountChip={showAccountChip}
            onToggleStar={handleToggleStar}
            onToggleSelect={(id, selected) => {
              setSelectedThreads((prev) => {
                const next = new Set(prev);
                if (selected) {
                  next.add(id);
                } else {
                  next.delete(id);
                }
                return next;
              });
            }}
            selectedThreads={selectedThreads}
            selectedThreadId={threadId}
            onToggleRead={handleToggleRead}
            onArchive={handleArchive}
            onTrash={handleTrash}
            onSpam={handleSpam}
          />
        )}
      </div>

      {hasThreadView && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </div>
      )}

      {editingDraft && (
        <ComposeDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setEditingDraft(null);
              fetchThreads(true);
            }
          }}
          addresses={addresses}
          draft={editingDraft}
        />
      )}
    </div>
  );
}
