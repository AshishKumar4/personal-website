import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/mail-constants';
import { getErrorMessage } from '@/lib/error-utils';
import { useMailContext } from '@/contexts/MailContext';
import type { EmailAddress } from '@shared/types';

export function useThrowaway() {
  const { refreshAddresses } = useMailContext();
  const [creating, setCreating] = useState(false);

  const createThrowaway = useCallback(async (): Promise<EmailAddress | null> => {
    setCreating(true);
    try {
      const created = await api<EmailAddress>(API_ENDPOINTS.ADDRESSES, {
        method: 'POST',
        body: JSON.stringify({ kind: 'throwaway' }),
      });
      try {
        await navigator.clipboard.writeText(created.address);
        toast.success(`${created.address} copied to clipboard`);
      } catch {
        toast.success(`Created ${created.address}`);
      }
      await refreshAddresses();
      return created;
    } catch (error) {
      toast.error(getErrorMessage(error));
      return null;
    } finally {
      setCreating(false);
    }
  }, [refreshAddresses]);

  return { createThrowaway, creating };
}
