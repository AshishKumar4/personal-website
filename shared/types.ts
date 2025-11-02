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
  company: string;
  logoUrl: string;
  role: string;
  duration: string;
  location: string;
  description: string;
  skills: string[];
}
export interface Project {
  name: string;
  description: string;
  repo: string;
  url: string;
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
    hashedPassword?: string; // Only on server
}
export interface LoginResponse {
    token: string;
    user: AuthUser;
}
// Site Config type
export interface SiteConfig {
  subtitle: string;
  bio: string;
}