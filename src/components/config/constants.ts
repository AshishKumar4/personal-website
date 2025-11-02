import { Github, Linkedin } from 'lucide-react';
import { Project } from '@shared/types';
export const PERSONAL_INFO = {
  name: "Ashish Kumar Singh",
  title: "ML Researcher & Software Engineer",
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