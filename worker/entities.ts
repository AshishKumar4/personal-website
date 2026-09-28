/**
 * Minimal real-world demo: One Durable Object instance per entity (User, ChatBoard), with Indexes for listing.
 */
import { Entity, IndexedEntity, Index } from "./core-utils";
import type { Env } from "./core-utils";
import { SEED_PROJECTS, EMPTY_MIGRATION_MARKER, isReplaceableField } from "./content-migration";
import { EXPERIENCE_STORIES, isReplaceableStory } from "./entry-stories";
import type { MigrationMarker, ProjectsMigrationStore } from "./content-migration";
import type { BlogPost, AuthUser, PendingAuth, SiteConfig, Experience, Project, ContactMessage, Email, EmailThread, EmailLabel, EmailDraft, EmailAddress, BlockedSender, EmailFeed, ApiTokenPublic } from "@shared/types";
import { EMAIL_DOMAIN } from "@shared/types";

export type ApiTokenRecord = ApiTokenPublic & { secretHash: string };



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
    story: EXPERIENCE_STORIES["cloudflare"],
    company: "Cloudflare",
    logoUrl: "/logos/cloudflare.svg",
    role: "Systems Engineer, Emerging Technologies & Incubation",
    duration: "Jun 2025 - Present",
    location: "Austin, TX, United States",
    description: "I created Seal, now Cloudflare OS, our internal platform for agentic work automation: long-running background agents, sandboxed execution and multi-tenant workspaces on Durable Objects, grown from a solo prototype to a platform with a dedicated team. Also created VibeSDK, our open-source AI app-generation platform (5K+ GitHub stars), built Mossaic, a version-controlled distributed file-system layer that powers Cloudflare OS storage, and worked with Monday.com on adapting VibeSDK for their AI app-building platform.",
    skills: ["Agentic Systems", "Durable Objects", "Distributed Systems", "Generative AI", "TypeScript"],
    order: 1,
  },
  {
    id: "umd",
    story: EXPERIENCE_STORIES["umd"],
    company: "University of Maryland, College Park",
    logoUrl: "/logos/umd.svg",
    role: "M.S. in Applied Machine Learning",
    duration: "Aug 2024 - May 2026",
    location: "College Park, MD, United States",
    description: "Went back to school for the ML depth I wanted: coursework and research across deep learning, computer vision and large-scale ML systems. Worked on Diff2Lip 2, an audio-guided diffusion lip-sync research project, running large ablation studies on UMD's SLURM clusters.",
    skills: ["Deep Learning", "Diffusion Models", "Computer Vision", "Research"],
    order: 2,
  },
  {
    id: "dyte",
    story: EXPERIENCE_STORIES["dyte"],
    company: "Dyte (acquired by Cloudflare)",
    logoUrl: "/logos/dyte.svg",
    role: "Machine Learning and Systems Engineer",
    duration: "Jun 2021 - Jul 2024 · 3 yrs 2 mos",
    location: "Bengaluru, India · Hybrid",
    description: "I was one of the founding engineers at Dyte, a programmable video SDK startup that Cloudflare later acquired. I designed and built Hive, our distributed WebRTC SFU and networking stack in Go, raising load handling capacity by about 15x. I also built a voice-to-voice bot SDK (Deepgram + LLaMA) with sub-800ms latency using speculative execution, and LLM automations that watched our GitHub repos and auto-generated reports, saving around 15 hours of manual reporting a week.",
    skills: ["WebRTC", "Golang", "Distributed Systems", "Generative AI", "Python"],
    order: 3,
  },
  {
    id: "hyperverge",
    story: EXPERIENCE_STORIES["hyperverge"],
    company: "HyperVerge Inc.",
    logoUrl: "/logos/hyperverge.webp",
    role: "Machine Learning Researcher",
    duration: "Dec 2019 - Jun 2021 · 1 yr 7 mos",
    location: "Bengaluru, Karnataka, India",
    description: "Led R&D on facial anti-spoofing and liveness detection models on Google TPUs, work that got the company its ISO 30107-3 certification. Built distributed data processing and TPU training pipelines that cut training times from weeks to hours and enabled 250+ experiments per week with Bayesian hyperparameter tuning.",
    skills: ["Computer Vision", "TensorFlow", "TPUs", "Distributed Training", "C++"],
    order: 4,
  },
  {
    id: "vit",
    story: EXPERIENCE_STORIES["vit"],
    company: "Vellore Institute of Technology",
    logoUrl: "/logos/vit.webp",
    role: "B.Tech in Computer Science",
    duration: "Jul 2016 - Jun 2020",
    location: "Vellore, India",
    description: "Where the tinkering got structure. I was the Technology Head of the Technology and Gaming Club, spent my weekends on CTFs with GreyFang (at one point #7 in India on CTFTime), and built autonomous drones with a bio-inspired robotics team on the side.",
    skills: ["Computer Science", "CTF / Security", "Robotics"],
    order: 5,
  },
];
export class ExperienceEntity extends IndexedEntity<Experience> {
    static readonly entityName = "experience";
    static readonly indexName = "experiences";
    static readonly initialState: Experience = { id: "", company: "", logoUrl: "", role: "", duration: "", location: "", description: "", skills: [] };
    static seedData = SEED_EXPERIENCE;
}
// PROJECT ENTITY
export class ProjectEntity extends IndexedEntity<Project> {
    static readonly entityName = "project";
    static readonly indexName = "projects";
    static readonly initialState: Project = { id: "", name: "", description: "", repo: "", url: "" };
    static seedData = SEED_PROJECTS;
}
export class MigrationEntity extends Entity<MigrationMarker> {
    static readonly entityName = "migration";
    static readonly initialState: MigrationMarker = EMPTY_MIGRATION_MARKER;
}
export function projectsMigrationStore(env: Env, migrationId: string): ProjectsMigrationStore {
    const marker = new MigrationEntity(env, migrationId);
    return {
        readMarker: () => marker.getState(),
        updateMarker: (fn) => marker.mutate((current) => fn({ ...current, id: migrationId })),
        listProjects: async () => (await ProjectEntity.list(env)).items,
        deleteProject: async (id) => { await ProjectEntity.delete(env, id); },
        addProjectIfAbsent: async (project) => {
            await new ProjectEntity(env, project.id).mutate((current) => (current.name ? current : project));
            await new Index<string>(env, ProjectEntity.indexName).add(project.id);
        },
        setOrderIfUnset: async (id, order) => {
            const entity = new ProjectEntity(env, id);
            if (!(await entity.exists())) return;
            await entity.mutate((current) => (current.name && typeof current.order !== "number" ? { ...current, order } : current));
        },
        setYearIfUnset: async (id, year) => {
            const entity = new ProjectEntity(env, id);
            if (!(await entity.exists())) return;
            await entity.mutate((current) => (current.name && !current.year ? { ...current, year } : current));
        },
        setStoryIfUnset: async (id, story) => {
            const entity = new ProjectEntity(env, id);
            if (!(await entity.exists())) return;
            await entity.mutate((current) => (current.name && isReplaceableStory(current.story) ? { ...current, story } : current));
        },
        setExperienceStoryIfUnset: async (id, story) => {
            const entity = new ExperienceEntity(env, id);
            if (!(await entity.exists())) return;
            await entity.mutate((current) => (current.company && isReplaceableStory(current.story) ? { ...current, story } : current));
        },
        setExperienceLogoIfReplaceable: async (id, logoUrl, retired) => {
            const entity = new ExperienceEntity(env, id);
            if (!(await entity.exists())) return;
            await entity.mutate((current) => (current.company && isReplaceableField(current.logoUrl, retired) ? { ...current, logoUrl } : current));
        },
        editAboutStory: async (edit) => {
            const config = new SiteConfigEntity(env, "main");
            if (!(await config.exists())) return;
            await config.mutate((current) => {
                const story = current.aboutStory ?? "";
                const next = edit(story);
                return next === story ? current : { ...current, aboutStory: next };
            });
        },
        setFieldIfReplaceable: async (id, field, value, retired) => {
            const entity = new ProjectEntity(env, id);
            if (!(await entity.exists())) return;
            await entity.mutate((current) => (current.name && isReplaceableField(current[field], retired) ? { ...current, [field]: value } : current));
        },
    };
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

export class PendingAuthEntity extends IndexedEntity<PendingAuth> {
    static readonly entityName = "pendingAuth";
    static readonly indexName = "pendingAuths";
    static readonly initialState: PendingAuth = { id: "", username: "", kind: "login", attempts: 0, expiresAt: 0 };
    static seedData: PendingAuth[] = [];
}
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
    static readonly initialState: SiteConfig = { subtitle: "", bio: "", about: "", aboutStory: "", backgroundEffect: 'grid' };
    static async seedData(env: { GlobalDurableObject: DurableObjectNamespace<any> }): Promise<void> {
        const config = new SiteConfigEntity(env, "main");
        if (!(await config.exists())) {
            await config.save({
                subtitle: "I love building things.",
                bio: "I'm an ML engineer and open-source enthusiast with a passion for science and technology. I love building things from scratch and challenging myself. My hobbies are building and flying FPV drones, and playing minecraft and valorant. I don't really like coding tbh (since I wrote an x86 kernel from scratch when I was 15)",
                about: "I've been building things since before I probably should have been. When I was 15 I taught myself C and x86 assembly and wrote a small multicore operating system from scratch, mostly off my phone over remote desktop since I was only allowed an hour of computer a day. That set the pattern for how I learn: if something grabs me, I have to build it myself to actually understand it. These days I'm a software engineer at Cloudflare's Emerging Technologies group, where I created Cloudflare OS, our internal platform for background agents, and VibeSDK, our open-source AI app builder. Before Cloudflare I spent around five years on ML and systems, architecting a distributed WebRTC SFU at Dyte and training computer vision models on TPUs at HyperVerge. On the side I keep tinkering: I wrote FlaxDiff, a diffusion library in JAX, and trained a text-to-image model on 128 TPUs, and lately I've been teaching a reinforcement learning agent to fly a drone from just vision. The question I've never quite let go of is whether a machine can actually think, and the ideas creeping towards it, like diffusion, world models and reinforcement learning, are where I spend my free time. That's where I wanna go next.",
                aboutStory: "",
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
const SEED_EMAIL_ADDRESSES: EmailAddress[] = [
    { id: "me", address: `me@${EMAIL_DOMAIN}`, name: "Ashish Kumar Singh", kind: "primary", status: "active", createdAt: 0 },
    { id: "contact", address: `contact@${EMAIL_DOMAIN}`, name: "Contact", kind: "primary", status: "active", createdAt: 0 },
];
export class EmailAddressEntity extends IndexedEntity<EmailAddress> {
    static readonly entityName = "emailAddress";
    static readonly indexName = "emailAddresses";
    static readonly initialState: EmailAddress = { id: "", address: "", name: "", kind: "custom", status: "active", createdAt: 0 };
    static seedData = SEED_EMAIL_ADDRESSES;
}
export class BlockedSenderEntity extends IndexedEntity<BlockedSender> {
    static readonly entityName = "blockedSender";
    static readonly indexName = "blockedSenders";
    static readonly initialState: BlockedSender = { id: "", address: "", createdAt: 0 };
    static seedData: BlockedSender[] = [];
}
export class EmailFeedEntity extends IndexedEntity<EmailFeed> {
    static readonly entityName = "emailFeed";
    static readonly indexName = "emailFeeds";
    static readonly initialState: EmailFeed = { id: "", name: "", color: "", accountIds: [], senders: [], createdAt: 0 };
    static seedData: EmailFeed[] = [];
}
export class ApiTokenEntity extends IndexedEntity<ApiTokenRecord> {
    static readonly entityName = "apiToken";
    static readonly indexName = "apiTokens";
    static readonly initialState: ApiTokenRecord = {
        id: "",
        name: "",
        secretHash: "",
        createdAt: 0,
        expiresAt: 0,
        lastUsedAt: 0,
    };
    static seedData: ApiTokenRecord[] = [];
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