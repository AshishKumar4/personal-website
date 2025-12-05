import { useEffect, useRef, useCallback } from 'react';
import { saveDraft, BlogPostDraft } from '@/lib/draft-storage';

interface UseEditorAutoSaveOptions {
  title: string;
  content: string;
  author: string;
  slug?: string;
  enabled?: boolean;
  debounceMs?: number;
  onSave?: () => void;
}

export function useEditorAutoSave({
  title,
  content,
  author,
  slug,
  enabled = true,
  debounceMs = 3000,
  onSave,
}: UseEditorAutoSaveOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  const saveNow = useCallback(() => {
    const draft: BlogPostDraft = {
      title,
      content,
      author,
      lastSaved: Date.now(),
      slug,
    };

    const draftString = JSON.stringify({ title, content, author });
    if (draftString !== lastSavedRef.current) {
      saveDraft(draft, slug);
      lastSavedRef.current = draftString;
      onSave?.();
    }
  }, [title, content, author, slug, onSave]);

  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveNow();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [title, content, author, enabled, debounceMs, saveNow]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      saveNow();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveNow]);

  return { saveNow };
}
