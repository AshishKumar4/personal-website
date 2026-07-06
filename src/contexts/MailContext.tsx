import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { api } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/mail-constants';
import type { EmailAddress, EmailLabel, EmailFeed, MailStats } from '@shared/types';

interface MailContextType {
  selectedAccount: string | null;
  setSelectedAccount: (account: string | null) => void;
  addresses: EmailAddress[];
  labels: EmailLabel[];
  feeds: EmailFeed[];
  stats: MailStats | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  refreshAddresses: () => Promise<void>;
  refreshFeeds: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

const MailContext = createContext<MailContextType | undefined>(undefined);

const STORAGE_KEY = 'mail-selected-account';
const STATS_REFRESH_INTERVAL = 60_000;

export function MailProvider({ children }: { children: ReactNode }) {
  const [selectedAccount, setSelectedAccountState] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );
  const [addresses, setAddresses] = useState<EmailAddress[]>([]);
  const [labels, setLabels] = useState<EmailLabel[]>([]);
  const [feeds, setFeeds] = useState<EmailFeed[]>([]);
  const [stats, setStats] = useState<MailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const setSelectedAccount = useCallback((account: string | null) => {
    setSelectedAccountState(account);
    if (account === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, account);
    }
  }, []);

  const refreshAddresses = useCallback(async () => {
    const res = await api<{ items: EmailAddress[] }>(API_ENDPOINTS.ADDRESSES);
    setAddresses(res.items);
  }, []);

  const refreshFeeds = useCallback(async () => {
    const res = await api<{ items: EmailFeed[] }>(API_ENDPOINTS.FEEDS);
    setFeeds(res.items);
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      setStats(await api<MailStats>(API_ENDPOINTS.STATS));
    } catch (err) {
      console.error('Failed to refresh mail stats:', err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const [addressesRes, labelsRes, feedsRes, statsRes] = await Promise.all([
        api<{ items: EmailAddress[] }>(API_ENDPOINTS.ADDRESSES),
        api<{ items: EmailLabel[] }>(API_ENDPOINTS.LABELS),
        api<{ items: EmailFeed[] }>(API_ENDPOINTS.FEEDS).catch(() => ({ items: [] as EmailFeed[] })),
        api<MailStats>(API_ENDPOINTS.STATS).catch(() => null),
      ]);
      if (!controller.signal.aborted) {
        setAddresses(addressesRes.items);
        setLabels(labelsRes.items);
        setFeeds(feedsRes.items);
        setStats(statsRes);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error('Failed to fetch mail data:', err);
        setError('Failed to load email configuration');
      }
    } finally {
      if (!controller.signal.aborted) {
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

  useEffect(() => {
    if (loading || !selectedAccount) return;
    if (!addresses.some((a) => a.id === selectedAccount)) {
      setSelectedAccount(null);
    }
  }, [loading, addresses, selectedAccount, setSelectedAccount]);

  useEffect(() => {
    const interval = setInterval(refreshStats, STATS_REFRESH_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshStats();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshStats]);

  return (
    <MailContext.Provider value={{
      selectedAccount,
      setSelectedAccount,
      addresses,
      labels,
      feeds,
      stats,
      loading,
      error,
      retry: fetchData,
      refreshAddresses,
      refreshFeeds,
      refreshStats,
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
