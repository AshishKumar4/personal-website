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
  /** Display position in the timeline (ascending). */
  order?: number;
}
export interface Project {
  id: string;
  name: string;
  description: string;
  repo: string;
  url: string;
  imageUrl?: string;
  order?: number;
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
  /** Markdown source, or (when format==='notebook') a JSON-encoded NotebookDoc. */
  content: string;
  author: string;
  createdAt: number; // epoch millis
  /** How `content` should be rendered. Defaults to 'markdown'. */
  format?: 'markdown' | 'notebook';
  /** Highlighted on the blog index. */
  featured?: boolean;
}

// A normalized Jupyter notebook, stored as JSON in BlogPost.content when format==='notebook'.
export interface NotebookDoc {
  colabUrl?: string;
  cells: NotebookCell[];
}
export type NotebookCell =
  | { kind: 'markdown'; source: string }
  | { kind: 'code'; source: string; lang: string; executionCount: number | null; outputs: NotebookOutput[] };
export type NotebookOutput =
  | { kind: 'stream'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'markdown'; source: string }
  | { kind: 'html'; html: string }
  | { kind: 'image'; url: string; alt: string };
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
export interface SiteFact {
  label: string;
  value: string;
}
export const ACCENT_PRESETS = ['vermilion', 'ultraviolet', 'cobalt', 'acid', 'amber'] as const;
export type AccentPreset = typeof ACCENT_PRESETS[number];
export const SCENE_IDS = ['night', 'kernel', 'breach', 'signal', 'noise', 'swarm', 'dawn'] as const;
export type SceneId = typeof SCENE_IDS[number];
export interface StoryLink {
  label: string;
  url: string;
}
export interface StoryChapter {
  id: string;
  scene: SceneId;
  era: string;
  title: string;
  body: string;
  highlights: SiteFact[];
  links?: StoryLink[];
}
export interface SiteConfig {
  subtitle: string;
  bio: string;
  about: string;
  /** Long-form markdown rendered on the dedicated /about page */
  aboutStory: string;
  backgroundEffect?: 'grid' | 'particles' | 'aurora' | 'matrix' | 'neural';
  heroPrompt?: string;
  portraitUrl?: string;
  now?: string;
  location?: string;
  facts?: SiteFact[];
  accent?: AccentPreset;
  story?: StoryChapter[];
}
export const DEFAULT_STORY: StoryChapter[] = [
  {
    id: 'one-hour-a-day',
    scene: 'kernel',
    era: 'Age 11 to 15',
    title: 'One hour a day.',
    body: "Computer time at home was rationed to an hour a day, which only made me want it more. At 11 I was running Counter-Strike servers for some of India's biggest game hosts.\n\nAt 15 I wanted to know what a computer actually does when it runs a program. Not the textbook diagram, the real thing. So I taught myself C and x86 assembly and wrote an operating system, mostly from a smartphone connected to my PC over remote desktop.",
    highlights: [
      { label: 'Aqeous OS', value: 'SMP x86 kernel' },
      { label: 'Written on', value: 'a smartphone' },
      { label: 'Also built', value: 'filesystem, compositor, libc' },
    ],
    links: [{ label: 'Aqeous on GitHub', url: 'https://github.com/AshishKumar4/Aqeous' }],
  },
  {
    id: 'breaking-things',
    scene: 'breach',
    era: '2016 to 2022',
    title: 'Then I learned to break things.',
    body: 'A friend and I started GreyFang, a two-person CTF team that climbed to #7 in India. We took second at the Nullcon Goa hardware CTF against university teams of ten, and came back in 2022 to win it.\n\nSecurity left me with one habit I never lost: assume nothing, verify everything, and read the layer below the one you are debugging.',
    highlights: [
      { label: 'GreyFang', value: '#7 in India' },
      { label: 'Nullcon Goa', value: 'Hardware CTF, won 2022' },
    ],
  },
  {
    id: 'infrastructure',
    scene: 'signal',
    era: '2019 to 2024',
    title: 'Research is an infrastructure problem.',
    body: 'At HyperVerge I trained face anti-spoofing models on TPUs and learned that progress is mostly plumbing: once our pipelines ran 250+ experiments a week, the experiments could finally keep up with our questions.\n\nAt Dyte, as a founding engineer, I designed and built Hive, our distributed WebRTC SFU in Go, and scaled it to handle about fifteen times the load. Cloudflare later acquired the company.',
    highlights: [
      { label: 'Experiments', value: '250+ a week' },
      { label: 'Hive SFU', value: '15x load capacity' },
      { label: 'Dyte', value: 'acquired by Cloudflare' },
    ],
  },
  {
    id: 'from-noise',
    scene: 'noise',
    era: '2024 to now',
    title: 'Order, out of noise.',
    body: 'To understand diffusion models I rebuilt them from scratch. FlaxDiff grew into a library I used to train text-to-image models on 400M+ image-text pairs across 128 TPUv4 chips.\n\nThat work became Dew: a JAX framework for training language models, diffusion models and JEPA encoders at any scale, from one GPU to a TPU pod.',
    highlights: [
      { label: 'Trained on', value: '128 TPUv4 chips' },
      { label: 'Data', value: '400M+ image-text pairs' },
      { label: 'Now', value: 'Dew, LLMs to diffusion' },
    ],
    links: [
      { label: 'FlaxDiff', url: 'https://github.com/AshishKumar4/FlaxDiff' },
      { label: 'Dew', url: 'https://github.com/AshishKumar4/dew' },
    ],
  },
  {
    id: 'machines-that-keep-working',
    scene: 'swarm',
    era: 'Cloudflare, 2025 to now',
    title: 'Machines that keep working while you sleep.',
    body: "At Cloudflare I created VibeSDK, an open-source platform that turns a sentence into a deployed app, and Cloudflare OS, where long-running agents do real work in their own sandboxes.\n\nOn my own time I build Kinu, an agent platform that keeps working while you are away. And do86, which boots my teenage kernel again, inside a Durable Object, on the edge.",
    highlights: [
      { label: 'VibeSDK', value: '5K+ GitHub stars' },
      { label: 'Kinu', value: 'agents with their own computers' },
      { label: 'do86', value: 'Aqeous, booting in the cloud' },
    ],
    links: [
      { label: 'VibeSDK', url: 'https://github.com/cloudflare/vibesdk' },
      { label: 'Kinu', url: 'https://github.com/AshishKumar4/kinu' },
    ],
  },
];
export const DEFAULT_SITE_EXTRAS: Required<Pick<SiteConfig, 'heroPrompt' | 'portraitUrl' | 'now' | 'location' | 'facts' | 'accent' | 'story'>> = {
  story: DEFAULT_STORY,
  heroPrompt: 'a person who builds things from scratch to understand them, first principles, high detail',
  portraitUrl: '/portrait-1200.webp',
  now: '',
  location: '',
  accent: 'vermilion',
  facts: [
    { label: 'First kernel', value: 'Aqeous, written at 15, mostly from a smartphone over remote desktop' },
    { label: 'Compute budget', value: '1 hour a day, rationed. Later: 128 TPUv4s' },
    { label: 'Security', value: 'GreyFang CTF, once #7 in India. Nullcon Goa hardware CTF winners, 2022' },
    { label: 'Interests', value: 'Diffusion, world models, reinforcement learning' },
    { label: 'Off-screen', value: 'FPV drones, Valorant, Minecraft, open-source microscopy' },
    { label: 'Open question', value: 'Can intelligence actually be built?' },
  ],
};
export type PostSummary = Omit<BlogPost, 'content'> & { excerpt: string; readingTime: number };
export interface HomePayload {
  config: SiteConfig;
  experiences: Experience[];
  projects: Project[];
  posts: PostSummary[];
}
export interface RepoStats {
  stars: number;
  forks: number;
  language: string | null;
  pushedAt: string | null;
}
export interface GitHubSnapshot {
  repos: Record<string, RepoStats>;
  user: { login: string; followers: number; publicRepos: number } | null;
  lastPush: { repo: string; at: string; message?: string } | null;
  fetchedAt: number;
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