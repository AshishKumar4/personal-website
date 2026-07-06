import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EmailReader } from '@/components/mail/EmailReader';
import { api } from '@/lib/api-client';
import { MAIL_ROUTES, API_ENDPOINTS } from '@/lib/mail-constants';
import type { Email, EmailThread } from '@shared/types';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useMailContext } from '@/contexts/MailContext';
import { useThreadActions } from '@/hooks/useThreadActions';
import { getErrorMessage } from '@/lib/error-utils';

export function MailThreadPage() {
  const { label = 'inbox', feedId, threadId } = useParams();
  const navigate = useNavigate();
  const { addresses } = useMailContext();
  const { updateThread, trashThread, spamThread, unblockSender } = useThreadActions();
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
    let ignore = false;
    const currentThreadId = threadId;
    const init = async () => {
      const threadRes = await fetchThread();
      if (!ignore && currentThreadId && threadRes && !threadRes.thread.read) {
        await updateThread(currentThreadId, { read: true });
      }
    };
    init();
    return () => { ignore = true; };
  }, [fetchThread, threadId, updateThread]);

  const handleEmailSent = useCallback(() => {
    fetchThread(false);
  }, [fetchThread]);

  const handleBack = () => {
    navigate(listPath);
  };

  const handleDelete = async () => {
    if (!threadId) return;
    try {
      await trashThread(threadId);
      toast.success('Moved to trash');
      navigate(listPath);
    } catch (error) {
      console.error('Failed to delete thread:', error);
      toast.error('Failed to delete');
    }
  };

  const handleToggleStar = async (id: string, starred: boolean) => {
    setThread((prev) => (prev ? { ...prev, starred } : null));
    try {
      await updateThread(id, { starred });
    } catch (error) {
      console.error('Failed to update thread:', error);
      setThread((prev) => (prev ? { ...prev, starred: !starred } : null));
      toast.error('Failed to update');
    }
  };

  const handleMarkUnread = async (id: string) => {
    try {
      await updateThread(id, { read: false });
      toast.success('Marked as unread');
      navigate(listPath);
    } catch (error) {
      console.error('Failed to mark as unread:', error);
      toast.error('Failed to update');
    }
  };

  const handleSpam = async (id: string) => {
    try {
      const result = await spamThread(id);
      if (result.blockedSenders.length > 0) {
        toast.success(`Marked as spam — blocked ${result.blockedSenders.join(', ')}`, {
          action: {
            label: 'Unblock',
            onClick: () => {
              Promise.all(result.blockedSenders.map((s) => unblockSender(s)))
                .then(() => toast.success('Sender unblocked'))
                .catch(() => toast.error('Failed to unblock'));
            },
          },
        });
      } else {
        toast.success('Marked as spam');
      }
      navigate(listPath);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleToggleLabel = async (labelId: string, checked: boolean) => {
    if (!thread) return;
    const nextLabels = checked
      ? [...new Set([...thread.labels, labelId])]
      : thread.labels.filter((l) => l !== labelId);
    const previous = thread;
    setThread({ ...thread, labels: nextLabels });
    try {
      await updateThread(thread.id, { labels: nextLabels });
    } catch (error) {
      console.error('Failed to update labels:', error);
      setThread(previous);
      toast.error('Failed to update labels');
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
      onSpam={handleSpam}
      onToggleLabel={handleToggleLabel}
      onEmailSent={handleEmailSent}
    />
  );
}
