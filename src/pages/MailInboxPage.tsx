import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { ThreadList } from '@/components/mail/ThreadList';
import { api } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/mail-constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Search, MoreVertical, Archive, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { EmailThread } from '@shared/types';
import { toast } from 'sonner';
import { useMailContext } from '@/contexts/MailContext';

export function MailInboxPage() {
  const { label = 'inbox', threadId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedAccount } = useMailContext();
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchThreads = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ label });
      if (selectedAccount) {
        params.append('account', selectedAccount);
      }
      const res = await api<{ items: EmailThread[] }>(
        `${API_ENDPOINTS.THREADS}?${params.toString()}`
      );
      if (!abortControllerRef.current.signal.aborted) {
        setThreads(res.items);
      }
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('Failed to fetch threads:', err);
        setError('Failed to load emails');
        toast.error('Failed to load emails');
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [label, selectedAccount]);

  useEffect(() => {
    fetchThreads();
    setSelectedThreads(new Set());
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchThreads]);

  const handleToggleStar = async (id: string, starred: boolean) => {
    const previousThreads = threads;
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, starred } : t))
    );
    try {
      await api(API_ENDPOINTS.THREAD(id), {
        method: 'PUT',
        body: JSON.stringify({ starred }),
      });
    } catch (error) {
      console.error('Failed to update thread:', error);
      setThreads(previousThreads);
      toast.error('Failed to update');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchThreads();
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const params = new URLSearchParams({ q: searchQuery });
      if (selectedAccount) {
        params.append('account', selectedAccount);
      }
      const res = await api<{ items: EmailThread[] }>(
        `${API_ENDPOINTS.SEARCH}?${params.toString()}`
      );
      if (!abortControllerRef.current.signal.aborted) {
        setThreads(res.items);
      }
    } catch (error) {
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('Search failed:', error);
        toast.error('Search failed');
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const handleBulkAction = async (action: 'trash' | 'archive' | 'read' | 'unread') => {
    if (selectedThreads.size === 0) return;

    const results = await Promise.allSettled(
      Array.from(selectedThreads).map((id) => {
        if (action === 'trash') {
          return api(API_ENDPOINTS.THREAD(id), { method: 'DELETE' });
        }
        if (action === 'archive') {
          return api(API_ENDPOINTS.THREAD(id), {
            method: 'PUT',
            body: JSON.stringify({ labels: ['archive'] }),
          });
        }
        return api(API_ENDPOINTS.THREAD(id), {
          method: 'PUT',
          body: JSON.stringify({ read: action === 'read' }),
        });
      })
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (failed === 0) {
      toast.success(`${succeeded} emails updated`);
    } else if (succeeded > 0) {
      toast.warning(`${succeeded} updated, ${failed} failed`);
    } else {
      toast.error('All actions failed');
    }

    setSelectedThreads(new Set());
    fetchThreads();
  };

  const hasThreadView = !!threadId;

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className={`flex flex-col ${hasThreadView ? 'w-96 border-r border-border' : 'flex-1'}`}>
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
          <Checkbox
            checked={selectedThreads.size === threads.length && threads.length > 0}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedThreads(new Set(threads.map((t) => t.id)));
              } else {
                setSelectedThreads(new Set());
              }
            }}
          />

          {selectedThreads.size > 0 ? (
            <>
              <Button variant="ghost" size="icon" onClick={() => handleBulkAction('archive')}>
                <Archive className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleBulkAction('trash')}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
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
              <Button variant="ghost" size="icon" onClick={fetchThreads}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <form onSubmit={handleSearch} className="flex-1 flex">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search emails..."
                    className="pl-8"
                  />
                </div>
              </form>
            </>
          )}
        </div>

        <ThreadList
          threads={threads}
          loading={loading}
          error={error}
          onRetry={fetchThreads}
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
        />
      </div>

      {hasThreadView && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </div>
      )}
    </div>
  );
}
