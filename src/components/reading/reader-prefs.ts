import { useCallback, useState } from 'react';

export type ReaderSize = 's' | 'm' | 'l';
export type ReaderTheme = 'night' | 'paper';

const SIZE_KEY = 'reader:size';
const THEME_KEY = 'reader:theme';

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
}

export function useReaderPrefs() {
  const [size, setSizeState] = useState<ReaderSize>(() => read(SIZE_KEY, ['s', 'm', 'l'] as const, 'm'));
  const [theme, setThemeState] = useState<ReaderTheme>(() => read(THEME_KEY, ['night', 'paper'] as const, 'night'));
  const setSize = useCallback((v: ReaderSize) => {
    setSizeState(v);
    write(SIZE_KEY, v);
  }, []);
  const setTheme = useCallback((v: ReaderTheme) => {
    setThemeState(v);
    write(THEME_KEY, v);
  }, []);
  return { size, setSize, theme, setTheme };
}
