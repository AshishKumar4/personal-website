/**
 * Minimal real-world demo: One Durable Object instance per entity (User, ChatBoard), with Indexes for listing.
 */
import { Entity, IndexedEntity } from "./core-utils";
import type { User, Chat, ChatMessage, BlogPost, AuthUser, SiteConfig, Experience } from "@shared/types";
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
// EXPERIENCE ENTITY
const SEED_EXPERIENCE: Experience[] = [
  {
    id: "cloudflare",
    company: "Cloudflare",
    logoUrl: "https://www.cloudflare.com/favicon.ico",
    role: "Software Engineer Intern",
    duration: "Jun 2025 - Present · 4 mos",
    location: "Maryland, United States · Remote",
    description: "Working in the Emerging Technology and Incubation team, focusing on advanced machine learning and AI infrastructure development and exploring multi agentic orchestration frameworks and their applications.",
    skills: ["Generative AI", "Distributed Systems", "Cloudflare Workers"],
  },
  {
    id: "dyte",
    company: "Dyte (now Cloudflare)",
    logoUrl: "https://cdn.prod.website-files.com/63ca2acc6352c21abe583d0/63cb76071fe6f5c0f6478cfa_favicon.svg",
    role: "Machine Learning and Systems Engineer",
    duration: "Jun 2021 - Aug 2024 · 3 yrs 3 mos",
    location: "India · Hybrid",
    description: "Spearheaded architecture design and development of WebRTC SFU/Networking Stack, increasing load handling capacity/scalability by 15x. Engineered voice-to-voice bot SDK (Deepgram + LLaMA) with <800ms latency using speculative execution. Developed LLM powered automations to monitor GitHub repository changes and auto-generate reports, cutting manual reporting by 15 hours weekly and improving code review efficiency by 20%.",
    skills: ["WebRTC", "Generative AI", "Distributed Systems", "Golang", "Python"],
  },
  {
    id: "hyperverge",
    company: "HyperVerge Inc.",
    logoUrl: "https://cdn.hyperverge.co/wp-content/uploads/2025/08/favicon.png",
    role: "Machine Learning Researcher",
    duration: "Jul 2020 - Jun 2021 · 1 yr",
    location: "Bengaluru, Karnataka, India",
    description: "Spearheaded research and development to build state-of-the-art facial anti-spoofing CV models, achieved ISO 30107-3 certification with nearly 0% false positives. Implemented distributed and parallelized data processing and TPU training pipelines, drastically reducing training times from weeks to hours—a 30x performance increase.",
    skills: ["Computer Vision", "PyTorch", "TensorFlow", "Distributed Training", "C++"],
  },
];
export class ExperienceEntity extends IndexedEntity<Experience> {
    static readonly entityName = "experience";
    static readonly indexName = "experiences";
    static readonly initialState: Experience = { id: "", company: "", logoUrl: "", role: "", duration: "", location: "", description: "", skills: [] };
    static seedData = SEED_EXPERIENCE;
}
// AUTH ENTITY
export class AuthEntity extends Entity<AuthUser> {
    static readonly entityName = "auth";
    static readonly initialState: AuthUser = { username: "", hashedPassword: "" };
    static async seedData(env: { GlobalDurableObject: DurableObjectNamespace<any> }): Promise<void> {
        const adminUser = new AuthEntity(env, "admin");
        if (!(await adminUser.exists())) {
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
    static readonly initialState: SiteConfig = { subtitle: "", bio: "", about: "" };
    static async seedData(env: { GlobalDurableObject: DurableObjectNamespace<any> }): Promise<void> {
        const config = new SiteConfigEntity(env, "main");
        if (!(await config.exists())) {
            await config.save({
                subtitle: "I love building things.",
                bio: "I'm an ML engineer and open-source enthusiast with a passion for science and technology. I love building things from scratch and challenging myself. My hobbies are building and flying FPV drones, and playing minecraft and valorant. I don't really like coding tbh (since I wrote an x86 kernel from scratch when I was 15)",
                about: "Machine Learning Researcher and Software Engineer with 5+ years of expertise in advancing computer vision, NLP, and distributed systems. Currently a Software Engineer Intern at Cloudflare and pursuing an M.S. in Applied Machine Learning at the University of Maryland, College Park, with a focus on generative AI (diffusion models, Transformers) and scalable ML infrastructure. Proven track record of driving innovation in industry and academia."
            });
            console.log("Default site configuration created.");
        }
    }
}