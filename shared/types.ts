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