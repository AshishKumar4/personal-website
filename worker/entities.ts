/**
 * Minimal real-world demo: One Durable Object instance per entity (User, ChatBoard), with Indexes for listing.
 */
import { Entity, IndexedEntity } from "./core-utils";
import type { User, Chat, ChatMessage, BlogPost, AuthUser, SiteConfig, Experience, Project, ContactMessage, Email, EmailThread, EmailLabel, EmailDraft } from "@shared/types";



// BLOG POST ENTITY
const SEED_BLOG_POSTS: BlogPost[] = [
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
    description: "Building and leading development of Vibesdk - OSS Reference vibe coding platform for building full-stack apps, slides from prompts, purely on Cloudflare developer platform - Workers, Durable Objects etc. Also helping multiple startups and enterprises build their own vibe-coding platforms",
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
// PROJECT ENTITY
const SEED_PROJECTS: Project[] = [
  {
    id: "cloudflare-vibesdk",
    name: "Cloudflare Vibesdk",
    description: "An open-source text-to-app platform built on Cloudflare's developer ecosystem, allowing users to generate, deploy, and iterate on web applications using natural language.",
    repo: "cloudflare/vibesdk",
    url: "https://github.com/cloudflare/vibesdk",
  },
  {
    id: "cloudflare-vibesdk-templates",
    name: "Cloudflare VibeSDK Templates",
    description: "This repository contains the official template catalog used by the Cloudflare VibeSDK project — a modern, open source “vibe coding” starter kit where users can build apps with AI agents.",
    repo: "cloudflare/vibesdk-templates",
    url: "https://github.com/cloudflare/vibesdk-templates",
  },
  {
    id: "ashishkumar4-flaxdiff",
    name: "FlaxDiff",
    description: "A JAX/Flax-based diffusion library replicating 17+ techniques. Trained 100M-parameter models on 250M+ images using 128 TPUv4s.",
    repo: "AshishKumar4/FlaxDiff",
    url: "https://github.com/AshishKumar4/FlaxDiff",
  },
  {
    id: "ashishkumar4-cf-git",
    name: "Cloudflare Workers-native isomorphic-git",
    description: "A Cloudflare Workers-native fork of isomorphic-git, Ported to work with the Cloudflare Workers runtime.",
    repo: "AshishKumar4/cf-git",
    url: "https://github.com/AshishKumar4/cf-git",
  },
  {
    id: "ashishkumar4-aqeous",
    name: "Aqeous OS",
    description: "A hobbyist operating system and kernel built from scratch in x86 Assembly and C.",
    repo: "AshishKumar4/Aqeous",
    url: "https://github.com/AshishKumar4/Aqeous",
  },
];
export class ProjectEntity extends IndexedEntity<Project> {
    static readonly entityName = "project";
    static readonly indexName = "projects";
    static readonly initialState: Project = { id: "", name: "", description: "", repo: "", url: "" };
    static seedData = SEED_PROJECTS;
}
// AUTH ENTITY
function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPasswordPBKDF2(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const hashBuffer = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );
    return bytesToHex(new Uint8Array(hashBuffer));
}

async function hashPasswordLegacySHA256(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
    return bytesToHex(new Uint8Array(hashBuffer));
}

function generateSalt(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return bytesToHex(array);
}

function generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return bytesToHex(array);
}

export { hashPasswordPBKDF2, hashPasswordLegacySHA256, generateSalt, generateSessionToken };

export class AuthEntity extends Entity<AuthUser> {
    static readonly entityName = "auth";
    static readonly initialState: AuthUser = { username: "", hashedPassword: "", salt: "", sessionToken: "", tokenExpiry: 0 };
    static async seedData(env: { GlobalDurableObject: DurableObjectNamespace<any> }): Promise<void> {
        const adminUser = new AuthEntity(env, "admin");
        if (!(await adminUser.exists())) {
            const password = "admin";
            const salt = generateSalt();
            const hashedPassword = await hashPasswordPBKDF2(password, salt);
            await adminUser.save({ username: "admin", hashedPassword, salt, sessionToken: "", tokenExpiry: 0 });
            console.log("Default admin user created with PBKDF2 hashing.");
        }
    }
}
// SITE CONFIG ENTITY
export class SiteConfigEntity extends Entity<SiteConfig> {
    static readonly entityName = "siteConfig";
    static readonly initialState: SiteConfig = { subtitle: "", bio: "", about: "", backgroundEffect: 'grid' };
    static async seedData(env: { GlobalDurableObject: DurableObjectNamespace<any> }): Promise<void> {
        const config = new SiteConfigEntity(env, "main");
        if (!(await config.exists())) {
            await config.save({
                subtitle: "I love building things.",
                bio: "I'm an ML engineer and open-source enthusiast with a passion for science and technology. I love building things from scratch and challenging myself. My hobbies are building and flying FPV drones, and playing minecraft and valorant. I don't really like coding tbh (since I wrote an x86 kernel from scratch when I was 15)",
                about: "Machine Learning Researcher and Software Engineer with 5+ years of expertise in advancing computer vision, NLP, and distributed systems. Currently a Software Engineer Intern at Cloudflare and pursuing an M.S. in Applied Machine Learning at the University of Maryland, College Park, with a focus on generative AI (diffusion models, Transformers) and scalable ML infrastructure. Proven track record of driving innovation in industry and academia.",
                backgroundEffect: 'grid'
            });
            console.log("Default site configuration created.");
        }
    }
}
// CONTACT MESSAGE ENTITY
export class ContactEntity extends IndexedEntity<ContactMessage> {
    static readonly entityName = "contact";
    static readonly indexName = "contacts";
    static readonly initialState: ContactMessage = { id: "", name: "", email: "", message: "", createdAt: 0 };
    static seedData: ContactMessage[] = [];
}
// EMAIL ENTITY
export class EmailEntity extends IndexedEntity<Email> {
    static readonly entityName = "email";
    static readonly indexName = "emails";
    static readonly initialState: Email = {
        id: "",
        account: "",
        threadId: "",
        from: "",
        to: [],
        subject: "",
        snippet: "",
        rawKey: "",
        attachments: [],
        labels: [],
        read: false,
        starred: false,
        createdAt: 0,
    };
    static seedData: Email[] = [];
}
// EMAIL THREAD ENTITY
export class EmailThreadEntity extends IndexedEntity<EmailThread> {
    static readonly entityName = "emailThread";
    static readonly indexName = "emailThreads";
    static readonly initialState: EmailThread = {
        id: "",
        account: "",
        subject: "",
        participants: [],
        snippet: "",
        emailCount: 0,
        lastEmailAt: 0,
        labels: [],
        read: false,
        starred: false,
    };
    static seedData: EmailThread[] = [];
}
// EMAIL LABEL ENTITY
const SEED_EMAIL_LABELS: EmailLabel[] = [
    { id: "inbox", name: "Inbox", type: "system" },
    { id: "sent", name: "Sent", type: "system" },
    { id: "drafts", name: "Drafts", type: "system" },
    { id: "starred", name: "Starred", type: "system" },
    { id: "important", name: "Important", type: "system" },
    { id: "trash", name: "Trash", type: "system" },
    { id: "spam", name: "Spam", type: "system" },
];
export class EmailLabelEntity extends IndexedEntity<EmailLabel> {
    static readonly entityName = "emailLabel";
    static readonly indexName = "emailLabels";
    static readonly initialState: EmailLabel = { id: "", name: "", type: "user" };
    static seedData = SEED_EMAIL_LABELS;
}
export class EmailDraftEntity extends IndexedEntity<EmailDraft> {
    static readonly entityName = "emailDraft";
    static readonly indexName = "emailDrafts";
    static readonly initialState: EmailDraft = {
        id: "",
        account: "",
        from: "",
        to: "",
        subject: "",
        body: "",
        attachments: [],
        updatedAt: 0,
        createdAt: 0,
    };
    static seedData: EmailDraft[] = [];
}