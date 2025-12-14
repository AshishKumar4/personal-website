import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EmailReader } from '@/components/mail/EmailReader';
import { api } from '@/lib/api-client';
import { MAIL_ROUTES, API_ENDPOINTS } from '@/lib/mail-constants';
import type { Email, EmailThread, EmailAccount } from '@shared/types';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function MailThreadPage() {
  const { label = 'inbox', threadId } = useParams();
  const navigate = useNavigate();
  const [thread, setThread] = useState<EmailThread | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);

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
      navigate(MAIL_ROUTES.LABEL(label));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [threadId, label, navigate]);

  useEffect(() => {
    const currentThreadId = threadId;
    const init = async () => {
      const [threadRes, accountsRes] = await Promise.all([
        fetchThread(),
        api<{ accounts: EmailAccount[] }>(API_ENDPOINTS.ACCOUNTS),
      ]);

      if (accountsRes) {
        setAccounts(accountsRes.accounts);
      }

      if (currentThreadId && threadRes && !threadRes.thread.read) {
        await api(API_ENDPOINTS.THREAD(currentThreadId), {
          method: 'PUT',
          body: JSON.stringify({ read: true }),
        });
      }
    };
    init();
  }, [fetchThread, threadId]);

  const handleEmailSent = useCallback(() => {
    fetchThread(false);
  }, [fetchThread]);

  const handleBack = () => {
    navigate(MAIL_ROUTES.LABEL(label));
  };

  const handleDelete = async () => {
    if (!threadId) return;
    try {
      await api(API_ENDPOINTS.THREAD(threadId), { method: 'DELETE' });
      toast.success('Moved to trash');
      navigate(MAIL_ROUTES.LABEL(label));
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
      navigate(MAIL_ROUTES.LABEL(label));
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
      accounts={accounts}
      onBack={handleBack}
      onDelete={handleDelete}
      onToggleStar={handleToggleStar}
      onMarkUnread={handleMarkUnread}
      onEmailSent={handleEmailSent}
    />
  );
}
