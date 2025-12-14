import {
  Inbox,
  Send,
  File,
  Star,
  AlertTriangle,
  Trash2,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';

export const API_ENDPOINTS = {
  SEND: '/api/mail/send',
  DRAFTS: '/api/mail/drafts',
  ACCOUNTS: '/api/mail/accounts',
  LABELS: '/api/mail/labels',
  SEARCH: '/api/mail/search',
  THREADS: '/api/mail/threads',
  THREAD: (id: string) => `/api/mail/threads/${id}`,
  ATTACHMENTS: (emailId: string, attId: string) => `/api/mail/attachments/${emailId}/${attId}`,
} as const;

export const MAIL_ROUTES = {
  INBOX: '/mail/inbox',
  COMPOSE: '/mail/compose',
  LABEL: (label: string) => `/mail/${label}`,
  THREAD: (label: string, threadId: string) => `/mail/${label}/${threadId}`,
} as const;

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
    'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li',
    'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'code',
    'img', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
  ],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'target'],
} as const;

export const MIN_HTML_DISPLAY_LENGTH = 10;
