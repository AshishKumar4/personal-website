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
export interface StoredPasskey {
    id: string;
    publicKey: string;
    counter: number;
    transports?: string[];
    name: string;
    createdAt: number;
}
export interface StoredTwoFactor {
    totpSecretEnc?: string;
    passkeys: StoredPasskey[];
    backupCodeHashes: string[];
}
export interface AuthUser {
    username: string;
    hashedPassword?: string;
    salt?: string;
    sessionToken?: string;
    tokenExpiry?: number;
    twoFactor?: StoredTwoFactor;
    failedAttempts?: number;
    lockedUntil?: number;
}
export interface PendingAuth {
    id: string;
    username: string;
    kind: 'enroll' | 'login' | 'manage';
    challenge?: string;
    totpSecretEnc?: string;
    attempts: number;
    expiresAt: number;
}
export interface LoginResponse {
    token: string;
    user: Pick<AuthUser, 'username'>;
}
// Two-factor auth
export interface PasskeyInfo {
    id: string;
    name: string;
    createdAt: number;
}
export interface TwoFactorStatus {
    enabled: boolean;
    hasTotp: boolean;
    passkeys: PasskeyInfo[];
    backupCodesRemaining: number;
}
export type LoginStep =
    | { step: 'setup'; setupToken: string }
    | { step: '2fa'; challengeToken: string; methods: { totp: boolean; passkey: boolean; backup: boolean } };
export interface SessionGrant {
    token: string;
    user: { username: string };
    backupCodes?: string[];
}
// API token types (short-lived programmatic access to the admin content API)
export interface ApiTokenPublic {
    id: string;
    name: string;
    createdAt: number;
    expiresAt: number;
    lastUsedAt: number;
}
export interface ApiTokenCreated extends ApiTokenPublic {
    token: string;
}
export const API_TOKEN_TTL_OPTIONS = [
    { label: '30 minutes', minutes: 30 },
    { label: '1 hour', minutes: 60 },
    { label: '6 hours', minutes: 360 },
    { label: '24 hours', minutes: 1440 },
] as const;
export const API_TOKEN_DEFAULT_TTL_MINUTES = 30;
export const API_TOKEN_MAX_TTL_MINUTES = 1440;
export function clampTtlMinutes(minutes: number): number {
    if (!Number.isFinite(minutes) || minutes <= 0) return API_TOKEN_DEFAULT_TTL_MINUTES;
    return Math.min(Math.floor(minutes), API_TOKEN_MAX_TTL_MINUTES);
}
// Site Config type
export interface SiteConfig {
  subtitle: string;
  bio: string;
  about: string;
  /** Long-form markdown rendered on the dedicated /about page */
  aboutStory: string;
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
  contentId?: string;
  disposition?: 'inline' | 'attachment';
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
export const EMAIL_DOMAIN = 'ashishkumarsingh.com';
export type EmailAddressKind = 'primary' | 'custom' | 'throwaway';
export type EmailAddressStatus = 'active' | 'suppressed';
export interface EmailAddress {
  id: string;
  address: string;
  name: string;
  kind: EmailAddressKind;
  status: EmailAddressStatus;
  note?: string;
  createdAt: number;
}
export interface BlockedSender {
  id: string;
  address: string;
  reason?: string;
  createdAt: number;
}
export interface EmailFeed {
  id: string;
  name: string;
  color: string;
  accountIds: string[];
  senders: string[];
  createdAt: number;
}
export interface MailStats {
  accounts: Record<string, number>;
  labels: Record<string, number>;
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