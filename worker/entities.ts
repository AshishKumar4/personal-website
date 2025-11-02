/**
 * Minimal real-world demo: One Durable Object instance per entity (User, ChatBoard), with Indexes for listing.
 */
import { Entity, IndexedEntity } from "./core-utils";
import type { User, Chat, ChatMessage, BlogPost, AuthUser, SiteConfig } from "@shared/types";
import { MOCK_CHAT_MESSAGES, MOCK_CHATS, MOCK_USERS } from "@shared/mock-data";
// USER ENTITY: one DO instance per user
export class UserEntity extends IndexedEntity<User> {
  static readonly entityName = "user";
  static readonly indexName = "users";
  static readonly initialState: User = { id: "", name: "" };
  static seedData = MOCK_USERS;
}
// CHAT BOARD ENTITY: one DO instance per chat board, stores its own messages
export type ChatBoardState = Chat & { messages: ChatMessage[] };
const SEED_CHAT_BOARDS: ChatBoardState[] = MOCK_CHATS.map(c => ({
  ...c,
  messages: MOCK_CHAT_MESSAGES.filter(m => m.chatId === c.id),
}));
export class ChatBoardEntity extends IndexedEntity<ChatBoardState> {
  static readonly entityName = "chat";
  static readonly indexName = "chats";
  static readonly initialState: ChatBoardState = { id: "", title: "", messages: [] };
  static seedData = SEED_CHAT_BOARDS;
  async listMessages(): Promise<ChatMessage[]> {
    const { messages } = await this.getState();
    return messages;
  }
  async sendMessage(userId: string, text: string): Promise<ChatMessage> {
    const msg: ChatMessage = { id: crypto.randomUUID(), chatId: this.id, userId, text, ts: Date.now() };
    await this.mutate(s => ({ ...s, messages: [...s.messages, msg] }));
    return msg;
  }
}
// BLOG POST ENTITY
const SEED_BLOG_POSTS: BlogPost[] = [
    {
        id: "hello-world",
        slug: "hello-world",
        title: "Hello, World!",
        content: "This is the first blog post. Welcome to the blog! This is a longer piece of content to demonstrate how a full post would look. We can include **markdown** here if we add a parser on the frontend. For now, it's just plain text. More content will be added later.",
        author: "Ashish Kumar Singh",
        createdAt: Date.now() - 86400000, // 1 day ago
    },
    {
        id: "building-with-durable-objects",
        slug: "building-with-durable-objects",
        title: "Building with Cloudflare Durable Objects",
        content: "Durable Objects provide a powerful way to manage state in a serverless environment. This blog is powered by them! This post explores the architecture and benefits of using Durable Objects for applications like this portfolio.",
        author: "Ashish Kumar Singh",
        createdAt: Date.now(),
    },
];
export class BlogEntity extends IndexedEntity<BlogPost> {
    static readonly entityName = "blogPost";
    static readonly indexName = "blogPosts";
    static readonly initialState: BlogPost = { id: "", slug: "", title: "", content: "", author: "", createdAt: 0 };
    static seedData = SEED_BLOG_POSTS;
}
// AUTH ENTITY
export class AuthEntity extends Entity<AuthUser> {
    static readonly entityName = "auth";
    static readonly initialState: AuthUser = { username: "", hashedPassword: "" };
    static async seedData(env: { GlobalDurableObject: DurableObjectNamespace<any> }): Promise<void> {
        const adminUser = new AuthEntity(env, "admin");
        if (!(await adminUser.exists())) {
            // In a real app, use a secure password hashing library like bcrypt or Argon2.
            // For this demo, we'll use a simple SHA-256 hash.
            const password = "admin"; // Default password
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            await adminUser.save({ username: "admin", hashedPassword });
            console.log("Default admin user created.");
        }
    }
}
// SITE CONFIG ENTITY
export class SiteConfigEntity extends Entity<SiteConfig> {
    static readonly entityName = "siteConfig";
    static readonly initialState: SiteConfig = { subtitle: "", bio: "" };
    static async seedData(env: { GlobalDurableObject: DurableObjectNamespace<any> }): Promise<void> {
        const config = new SiteConfigEntity(env, "main");
        if (!(await config.exists())) {
            await config.save({
                subtitle: "I love building things.",
                bio: "I'm an ML engineer and open-source enthusiast with a passion for building things that matter. My work often involves diving deep into generative AI, particularly diffusion models, and exploring the frontiers of AI-driven innovation. When I'm not coding, you can find me flying FPV drones, working on 3D printing projects, or relaxing with a game of Minecraft or Valorant. For me, it's all about the joy of creating—whether in code or in the physical world."
            });
            console.log("Default site configuration created.");
        }
    }
}