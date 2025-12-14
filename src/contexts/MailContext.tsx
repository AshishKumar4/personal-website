import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { api } from '@/lib/api-client';
import type { EmailAccount, EmailLabel } from '@shared/types';

interface MailContextType {
  selectedAccount: string | null;
  setSelectedAccount: (account: string | null) => void;
  accounts: EmailAccount[];
  labels: EmailLabel[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

const MailContext = createContext<MailContextType | undefined>(undefined);

const STORAGE_KEY = 'mail-selected-account';

export function MailProvider({ children }: { children: ReactNode }) {
  const [selectedAccount, setSelectedAccountState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved;
    }
    return null;
  });
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [labels, setLabels] = useState<EmailLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const [accountsRes, labelsRes] = await Promise.all([
        api<{ accounts: EmailAccount[] }>('/api/mail/accounts'),
        api<{ items: EmailLabel[] }>('/api/mail/labels'),
      ]);
      if (!abortControllerRef.current.signal.aborted) {
        setAccounts(accountsRes.accounts);
        setLabels(labelsRes.items);
      }
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('Failed to fetch mail data:', err);
        setError('Failed to load email configuration');
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchData]);

  const setSelectedAccount = useCallback((account: string | null) => {
    setSelectedAccountState(account);
    if (typeof window !== 'undefined') {
      if (account === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, account);
      }
    }
  }, []);

  return (
    <MailContext.Provider value={{
      selectedAccount,
      setSelectedAccount,
      accounts,
      labels,
      loading,
      error,
      retry: fetchData,
    }}>
      {children}
    </MailContext.Provider>
  );
}

export function useMailContext() {
  const context = useContext(MailContext);
  if (!context) {
    throw new Error('useMailContext must be used within a MailProvider');
  }
  return context;
}
