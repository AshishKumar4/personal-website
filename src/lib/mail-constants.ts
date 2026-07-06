import {
  Inbox,
  Send,
  File,
  Star,
  AlertTriangle,
  Trash2,
  AlertCircle,
  Mail,
  AtSign,
  Ghost,
  type LucideIcon,
} from 'lucide-react';
import type { EmailAddressKind } from '@shared/types';

export const API_ENDPOINTS = {
  SEND: '/api/mail/send',
  DRAFTS: '/api/mail/drafts',
  DRAFT: (id: string) => `/api/mail/drafts/${id}`,
  ADDRESSES: '/api/mail/addresses',
  ADDRESS: (id: string) => `/api/mail/addresses/${id}`,
  LABELS: '/api/mail/labels',
  FEEDS: '/api/mail/feeds',
  FEED: (id: string) => `/api/mail/feeds/${id}`,
  BLOCKED_SENDERS: '/api/mail/blocked-senders',
  BLOCKED_SENDER: (address: string) => `/api/mail/blocked-senders/${encodeURIComponent(address)}`,
  STATS: '/api/mail/stats',
  SEARCH: '/api/mail/search',
  THREADS: '/api/mail/threads',
  THREAD: (id: string) => `/api/mail/threads/${id}`,
  THREAD_SPAM: (id: string) => `/api/mail/threads/${id}/spam`,
  ATTACHMENTS: (emailId: string, attId: string) => `/api/mail/attachments/${emailId}/${attId}`,
} as const;

export const MAIL_ROUTES = {
  INBOX: '/mail/inbox',
  COMPOSE: '/mail/compose',
  SETTINGS: (tab: 'addresses' | 'feeds' | 'blocked' = 'addresses') => `/mail/settings/${tab}`,
  LABEL: (label: string) => `/mail/${label}`,
  THREAD: (label: string, threadId: string) => `/mail/${label}/${threadId}`,
  FEED: (feedId: string) => `/mail/feeds/${feedId}`,
  FEED_THREAD: (feedId: string, threadId: string) => `/mail/feeds/${feedId}/${threadId}`,
} as const;

export const KIND_META: Record<EmailAddressKind, { icon: LucideIcon; label: string }> = {
  primary: { icon: Mail, label: 'Primary' },
  custom: { icon: AtSign, label: 'Custom' },
  throwaway: { icon: Ghost, label: 'Throwaway' },
};

export const FEED_COLORS = [
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#64748b',
] as const;

export const LABEL_ICONS: Record<string, LucideIcon> = {
  inbox: Inbox,
  sent: Send,
  drafts: File,
  starred: Star,
  important: AlertTriangle,
  trash: Trash2,
  spam: AlertCircle,
};

export const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [
    // Structure
    'div', 'span', 'p', 'br', 'hr',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Text formatting
    'b', 'i', 'u', 's', 'strong', 'em', 'del', 'ins', 'mark',
    'small', 'big', 'sub', 'sup', 'abbr', 'acronym', 'cite', 'code', 'pre',
    // Legacy email formatting (Outlook, old clients)
    'font', 'center',
    // Links and media
    'a', 'img', 'figure', 'figcaption',
    // Lists
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    // Tables — full set required for HTML email layouts
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col', 'caption',
    // Blockquote / quote threads
    'blockquote', 'address',
    // Semantic (used in modern email templates)
    'article', 'section', 'header', 'footer', 'aside', 'main', 'nav',
    // Misc inline
    'time', 'details', 'summary',
  ],
  ALLOWED_ATTR: [
    // Core
    'href', 'src', 'alt', 'title', 'id', 'name', 'class',
    // Inline styles — critical: HTML emails style everything with style=""
    'style',
    // Link behaviour
    'target', 'rel',
    // Layout attrs used heavily in HTML email tables
    'width', 'height', 'align', 'valign',
    'border', 'cellpadding', 'cellspacing',
    // Cell structure
    'colspan', 'rowspan',
    // Legacy color attrs (Outlook-generated HTML)
    'bgcolor', 'color',
    // Images
    'srcset', 'loading', 'referrerpolicy',
    // Data attrs used by some email clients
    'data-id',
  ],
  FORCE_BODY: true,
} as const;

export const MIN_HTML_DISPLAY_LENGTH = 10;
