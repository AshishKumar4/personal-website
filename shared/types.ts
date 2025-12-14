export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
// Minimal real-world chat example types (shared by frontend and worker)
export interface User {
  id: string;
  name: string;
}
export interface Chat {
  id: string;
  title: string;
}
export interface ChatMessage {
  id: string;
  chatId: string;
  userId: string;
  text: string;
  ts: number; // epoch millis
}
// Portfolio types
export interface Experience {
  id: string;
  company: string;
  logoUrl: string;
  role: string;
  duration: string;
  location: string;
  description: string;
  skills: string[];
}
export interface Project {
  id: string;
  name: string;
  description: string;
  repo: string;
  url: string;
  imageUrl?: string;
}
export interface GitHubRepo {
  stars: number;
  forks: number;
}
// Blog types
export interface BlogPost {
  id: string; // Should be the same as slug for IndexedEntity
  slug: string;
  title: string;
  content: string;
  author: string;
  createdAt: number; // epoch millis
}
// Auth types
export interface AuthUser {
    username: string;
    hashedPassword?: string;
    salt?: string;
    sessionToken?: string;
    tokenExpiry?: number;
}
export interface LoginResponse {
    token: string;
    user: Pick<AuthUser, 'username'>;
}
// Site Config type
export interface SiteConfig {
  subtitle: string;
  bio: string;
  about: string;
  backgroundEffect: 'grid' | 'particles' | 'aurora' | 'matrix' | 'neural';
}
// Password Change type
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
// Contact Message type
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: number;
}
// Email System types
export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  r2Key: string;
}

export interface AttachmentFile {
  file: File;
  id: string;
}
export interface Email {
  id: string;
  account: string;
  threadId: string;
  messageId?: string;
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject: string;
  snippet: string;
  htmlBody?: string;
  textBody?: string;
  rawKey: string;
  attachments: EmailAttachment[];
  labels: string[];
  read: boolean;
  starred: boolean;
  createdAt: number;
  inReplyTo?: string;
  references?: string[];
}
export interface EmailThread {
  id: string;
  account: string;
  subject: string;
  participants: string[];
  snippet: string;
  emailCount: number;
  lastEmailAt: number;
  labels: string[];
  read: boolean;
  starred: boolean;
}
export interface EmailLabel {
  id: string;
  name: string;
  color?: string;
  type: 'system' | 'user';
}
export interface EmailAccount {
  address: string;
  name: string;
}
export interface EmailDraft {
  id: string;
  account: string;
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  attachments: EmailAttachment[];
  inReplyTo?: string;
  threadId?: string;
  updatedAt: number;
  createdAt: number;
}
export const SYSTEM_LABELS = ['inbox', 'sent', 'drafts', 'starred', 'trash', 'spam'] as const;
export type SystemLabel = typeof SYSTEM_LABELS[number];
export const EMAIL_ACCOUNT_IDS = ['me', 'contact'] as const;
export type EmailAccountId = typeof EMAIL_ACCOUNT_IDS[number];
export const EMAIL_ACCOUNTS_CONFIG: EmailAccount[] = [
  { address: 'me@ashishkumarsingh.com', name: 'Ashish Kumar Singh' },
  { address: 'contact@ashishkumarsingh.com', name: 'Contact' },
];
export interface R2FileItem {
  key: string;
  name: string;
  size: number;
  lastModified: number;
  type: 'file' | 'folder';
  contentType?: string;
}
export interface R2ListResponse {
  items: R2FileItem[];
  prefix: string;
  cursor?: string;
  truncated: boolean;
}
export interface MultipartUploadInit {
  uploadId: string;
  key: string;
}
export interface MultipartUploadPart {
  partNumber: number;
  etag: string;
}