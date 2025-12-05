export interface BlogPostDraft {
  title: string;
  content: string;
  author: string;
  lastSaved: number;
  slug?: string;
}

const DRAFT_PREFIX = 'draft:post:';

export function getDraftKey(slug?: string): string {
  return `${DRAFT_PREFIX}${slug || 'new'}`;
}

export function saveDraft(draft: BlogPostDraft, slug?: string): void {
  try {
    const key = getDraftKey(slug);
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (error) {
    console.error('Failed to save draft:', error);
  }
}

export function loadDraft(slug?: string): BlogPostDraft | null {
  try {
    const key = getDraftKey(slug);
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as BlogPostDraft;
  } catch (error) {
    console.error('Failed to load draft:', error);
    return null;
  }
}

export function deleteDraft(slug?: string): void {
  try {
    const key = getDraftKey(slug);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to delete draft:', error);
  }
}

export function hasDraft(slug?: string): boolean {
  const key = getDraftKey(slug);
  return localStorage.getItem(key) !== null;
}

export function isDraftNewer(draft: BlogPostDraft, serverUpdatedAt?: number): boolean {
  if (!serverUpdatedAt) return true;
  return draft.lastSaved > serverUpdatedAt;
}
