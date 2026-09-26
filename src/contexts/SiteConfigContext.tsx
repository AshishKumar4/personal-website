import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { loadGitHub, loadHome, peekHome } from '@/lib/site-data';
import type { GitHubSnapshot, HomePayload, SiteConfig } from '@shared/types';

interface SiteConfigContextType {
  config: SiteConfig | null;
  data: HomePayload | null;
  github: GitHubSnapshot | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const SiteConfigContext = createContext<SiteConfigContextType | undefined>(undefined);

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<HomePayload | null>(peekHome);
  const [github, setGithub] = useState<GitHubSnapshot | null>(null);
  const [loading, setLoading] = useState(!peekHome());
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async (force = true) => {
    try {
      setError(null);
      setData(await loadHome(force));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load site'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch(false);
    let alive = true;
    loadGitHub().then(snapshot => {
      if (alive) setGithub(snapshot);
    });
    return () => {
      alive = false;
    };
  }, [refetch]);

  const value: SiteConfigContextType = {
    config: data?.config ?? null,
    data,
    github,
    loading,
    error,
    refetch: () => refetch(true),
  };

  return <SiteConfigContext.Provider value={value}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig() {
  const context = useContext(SiteConfigContext);
  if (context === undefined) {
    throw new Error('useSiteConfig must be used within a SiteConfigProvider');
  }
  return context;
}
