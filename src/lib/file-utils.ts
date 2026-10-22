import { EMAIL_DOMAIN } from '@shared/types';

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function getFileIcon(contentType?: string, isFolder?: boolean): string {
  if (isFolder) return 'folder';
  if (!contentType) return 'file';
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType.startsWith('text/')) return 'file-text';
  if (contentType === 'application/pdf') return 'file-text';
  if (contentType.includes('zip') || contentType.includes('archive')) return 'archive';
  return 'file';
}

export const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
export const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB

export const FILES_ADMIN_ORIGIN = window.location.hostname === EMAIL_DOMAIN ? `https://mail.${EMAIL_DOMAIN}` : '';
export const SITE_ORIGIN = window.location.origin.replace('://mail.', '://');

export function shareUrl(token: string): string {
  return `${SITE_ORIGIN}/s/${token}`;
}
