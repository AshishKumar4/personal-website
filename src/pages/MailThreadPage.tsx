import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EmailReader } from '@/components/mail/EmailReader';
import { api } from '@/lib/api-client';
import { MAIL_ROUTES, API_ENDPOINTS } from '@/lib/mail-constants';
import type { Email, EmailThread } from '@shared/types';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useMailContext } from '@/contexts/MailContext';

export function MailThreadPage() {
  const { label = 'inbox', feedId, threadId } = useParams();
  const navigate = useNavigate();
  const { addresses, refreshStats } = useMailContext();
  const [thread, setThread] = useState<EmailThread | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  const listPath = feedId ? MAIL_ROUTES.FEED(feedId) : MAIL_ROUTES.LABEL(label);

  const fetchThread = useCallback(async (showLoading = true) => {
    if (!threadId) return;
    if (showLoading) setLoading(true);
    try {
      const threadRes = await api<{ thread: EmailThread; emails: Email[] }>(
        API_ENDPOINTS.THREAD(threadId)
      );
      setThread(threadRes.thread);
      setEmails(threadRes.emails);
      return threadRes;
    } catch (error) {
      console.error('Failed to fetch thread:', error);
      toast.error('Failed to load email');
      navigate(listPath);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [threadId, listPath, navigate]);

  useEffect(() => {
    const currentThreadId = threadId;
    const init = async () => {
      const threadRes = await fetchThread();
      if (currentThreadId && threadRes && !threadRes.thread.read) {
        await api(API_ENDPOINTS.THREAD(currentThreadId), {
          method: 'PUT',
          body: JSON.stringify({ read: true }),
        });
        refreshStats();
      }
    };
    init();
  }, [fetchThread, threadId, refreshStats]);

  const handleEmailSent = useCallback(() => {
    fetchThread(false);
  }, [fetchThread]);

  const handleBack = () => {
    navigate(listPath);
  };

  const handleDelete = async () => {
    if (!threadId) return;
    try {
      await api(API_ENDPOINTS.THREAD(threadId), { method: 'DELETE' });
      toast.success('Moved to trash');
      refreshStats();
      navigate(listPath);
    } catch (error) {
      console.error('Failed to delete thread:', error);
      toast.error('Failed to delete');
    }
  };

  const handleToggleStar = async (id: string, starred: boolean) => {
    try {
      await api(API_ENDPOINTS.THREAD(id), {
        method: 'PUT',
        body: JSON.stringify({ starred }),
      });
      setThread((prev) => (prev ? { ...prev, starred } : null));
    } catch (error) {
      console.error('Failed to update thread:', error);
      toast.error('Failed to update');
    }
  };

  const handleMarkUnread = async (id: string) => {
    try {
      await api(API_ENDPOINTS.THREAD(id), {
        method: 'PUT',
        body: JSON.stringify({ read: false }),
      });
      toast.success('Marked as unread');
      refreshStats();
      navigate(listPath);
    } catch (error) {
      console.error('Failed to mark as unread:', error);
      toast.error('Failed to update');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!thread) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Email not found
      </div>
    );
  }

  return (
    <EmailReader
      thread={thread}
      emails={emails}
      addresses={addresses}
      onBack={handleBack}
      onDelete={handleDelete}
      onToggleStar={handleToggleStar}
      onMarkUnread={handleMarkUnread}
      onEmailSent={handleEmailSent}
    />
  );
}
