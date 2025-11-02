import { Github, Linkedin } from 'lucide-react';
import { Experience, Project } from '@shared/types';
export const PERSONAL_INFO = {
  name: "Ashish Kumar Singh",
  title: "ML Researcher & Software Engineer",
  bio: "I’m Ashish—an ML engineer, tinkerer, and open-source enthusiast who finds genuine joy in building things that push the boundaries of what’s possible. Ever since I was a kid writing x86 assembly code just to see how kernels tick, I’ve been fascinated by the intricate details of technology and the endless potential of machine learning. Today, I still love getting my hands dirty with code, scaling massive experiments across distributed systems, and collaborating with like-minded folks to tackle hard problems head-on. For me, it’s all about learning something new each day, creating tools that make a difference, and exploring the frontiers of AI-driven innovation.",
  about: "Machine Learning Researcher and Software Engineer with 5+ years of expertise in advancing computer vision, NLP, and distributed systems. Currently a Software Engineer Intern at Cloudflare and pursuing an M.S. in Applied Machine Learning at the University of Maryland, College Park, with a focus on generative AI (diffusion models, Transformers) and scalable ML infrastructure. Proven track record of driving innovation in industry and academia.",
  email: "ashishkmr472@gmail.com",
  profilePicture: "https://avatars.githubusercontent.com/u/36689133?v=4",
};
export const SOCIAL_LINKS = [
  {
    name: "GitHub",
    url: "https://github.com/ashishkumar4",
    Icon: Github,
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/in/aksnip/",
    Icon: Linkedin,
  },
];
export const NAV_LINKS = [
  { name: "About", href: "#about" },
  { name: "Experience", href: "#experience" },
  { name: "Projects", href: "#projects" },
  { name: "Blog", href: "/blog" },
];
export const PROFESSIONAL_EXPERIENCE: Experience[] = [
  {
    company: "Cloudflare",
    logoUrl: "https://www.cloudflare.com/favicon.ico",
    role: "Software Engineer Intern",
    duration: "Jun 2025 - Present · 4 mos",
    location: "Maryland, United States · Remote",
    description: "Working in the Emerging Technology and Incubation team, focusing on advanced machine learning and AI infrastructure development and exploring multi agentic orchestration frameworks and their applications.",
    skills: ["Generative AI", "Distributed Systems", "Cloudflare Workers"],
  },
  {
    company: "Dyte (now Cloudflare)",
    logoUrl: "https://cdn.prod.website-files.com/63ca2acc6352c221abe583d0/63cb76071fe6f5c0f6478cfa_favicon.svg",
    role: "Machine Learning and Systems Engineer",
    duration: "Jun 2021 - Aug 2024 · 3 yrs 3 mos",
    location: "India · Hybrid",
    description: "Spearheaded architecture design and development of WebRTC SFU/Networking Stack, increasing load handling capacity/scalability by 15x. Engineered voice-to-voice bot SDK (Deepgram + LLaMA) with <800ms latency using speculative execution. Developed LLM powered automations to monitor GitHub repository changes and auto-generate reports, cutting manual reporting by 15 hours weekly and improving code review efficiency by 20%.",
    skills: ["WebRTC", "Generative AI", "Distributed Systems", "Golang", "Python"],
  },
  {
    company: "HyperVerge Inc.",
    logoUrl: "https://cdn.hyperverge.co/wp-content/uploads/2025/08/favicon.png",
    role: "Machine Learning Researcher",
    duration: "Jul 2020 - Jun 2021 · 1 yr",
    location: "Bengaluru, Karnataka, India",
    description: "Spearheaded research and development to build state-of-the-art facial anti-spoofing CV models, achieved ISO 30107-3 certification with nearly 0% false positives. Implemented distributed and parallelized data processing and TPU training pipelines, drastically reducing training times from weeks to hours—a 30x performance increase.",
    skills: ["Computer Vision", "PyTorch", "TensorFlow", "Distributed Training", "C++"],
  },
];
export const KEY_PROJECTS: Project[] = [
  {
    name: "Cloudflare Vibesdk",
    description: "An open-source text-to-app platform built on Cloudflare's developer ecosystem, allowing users to generate, deploy, and iterate on web applications using natural language.",
    repo: "cloudflare/vibesdk",
    url: "https://github.com/cloudflare/vibesdk",
  },
  {
    name: "Cloudflare VibeSDK Templates",
    description: "This repository contains the official template catalog used by the Cloudflare VibeSDK project — a modern, open source ���vibe coding” starter kit where users can build apps with AI agents.",
    repo: "cloudflare/vibesdk-templates",
    url: "https://github.com/cloudflare/vibesdk-templates",
  },
  {
    name: "FlaxDiff",
    description: "A JAX/Flax-based diffusion library replicating 17+ techniques. Trained 100M-parameter models on 250M+ images using 128 TPUv4s.",
    repo: "AshishKumar4/FlaxDiff",
    url: "https://github.com/AshishKumar4/FlaxDiff",
  },
  {
    name: "Cloudflare Workers-native isomorphic-git",
    description: "A Cloudflare Workers-native fork of isomorphic-git, Ported to work with the Cloudflare Workers runtime.",
    repo: "AshishKumar4/cf-git",
    url: "https://github.com/AshishKumar4/cf-git",
  },
  {
    name: "Aqeous OS",
    description: "A hobbyist operating system and kernel built from scratch in x86 Assembly and C.",
    repo: "AshishKumar4/Aqeous",
    url: "https://github.com/AshishKumar4/Aqeous",
  },
];