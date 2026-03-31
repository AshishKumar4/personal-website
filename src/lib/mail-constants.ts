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
