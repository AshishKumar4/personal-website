import { useCallback } from 'react';
import { api } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/mail-constants';
import { useMailContext } from '@/contexts/MailContext';
import type { EmailThread } from '@shared/types';

export interface SpamResult {
  id: string;
  spam: boolean;
  blockedSenders: string[];
}

export function useThreadActions() {
  const { refreshStats } = useMailContext();

  const updateThread = useCallback(
    async (id: string, body: Partial<Pick<EmailThread, 'read' | 'starred' | 'labels'>>) => {
      const updated = await api<EmailThread>(API_ENDPOINTS.THREAD(id), {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      refreshStats();
      return updated;
    },
    [refreshStats]
  );

  const trashThread = useCallback(
    async (id: string) => {
      await api(API_ENDPOINTS.THREAD(id), { method: 'DELETE' });
      refreshStats();
    },
    [refreshStats]
  );

  const archiveThread = useCallback(
    (thread: EmailThread) =>
      updateThread(thread.id, { labels: thread.labels.filter((l) => l !== 'inbox') }),
    [updateThread]
  );

  const spamThread = useCallback(
    async (id: string, blockSenders = true) => {
      const result = await api<SpamResult>(API_ENDPOINTS.THREAD_SPAM(id), {
        method: 'POST',
        body: JSON.stringify({ blockSenders }),
      });
      refreshStats();
      return result;
    },
    [refreshStats]
  );

  const unblockSender = useCallback(async (address: string) => {
    await api(API_ENDPOINTS.BLOCKED_SENDER(address), { method: 'DELETE' });
  }, []);

  return { updateThread, trashThread, archiveThread, spamThread, unblockSender };
}
