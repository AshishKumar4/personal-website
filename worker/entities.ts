/**
 * Minimal real-world demo: One Durable Object instance per entity (User, ChatBoard), with Indexes for listing.
 */
import { IndexedEntity } from "./core-utils";
import type { User, Chat, ChatMessage, BlogPost } from "@shared/types";
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
    static override keyOf(state: BlogPost): string { return state.slug; }
}