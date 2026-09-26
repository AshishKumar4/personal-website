export const PROJECT_STORIES: Record<string, string> = {
  "ashishkumar4-aqeous":
    "Computer time at home was rationed to an hour a day, which only made me want it more. At 15 I wanted to know what a computer actually does when it runs a program, so I taught myself C and x86 assembly and started writing an operating system, mostly on a smartphone connected to my PC over remote desktop.\n\nIt was never really finished, but it set the way I still learn: if something fascinates me, I have to build it from the ground up before I feel like I understand it.",
  "ashishkumar4-flaxdiff":
    "There is a question that has been stuck in my head since I was a kid: can intelligence actually be built? FlaxDiff was one way of chasing it. I wrote a diffusion library in JAX/Flax, implemented 17+ techniques to understand what each one was really doing, and trained a ~100M-parameter text-to-image model from scratch on 128 TPUv4s.",
  "cloudflare-vibesdk":
    "Alongside Cloudflare OS I created VibeSDK: describe an app in plain language, and it gets generated, deployed and iterated on, entirely on Cloudflare. We open-sourced it, and it has passed 5K stars on GitHub.",
  flydreamer:
    "Lately I have been teaching a DreamerV3-style world-model agent to fly an FPV drone from vision alone, in simulation environments I built for it. Reward shaping is humbling, tbh.",
  do86:
    "do86 runs x86 operating systems inside a Cloudflare Durable Object, with guest memory paged in from SQLite. It boots Aqeous, the kernel I wrote at 15.",
  kinu:
    "Kinu is an agent platform that keeps working while you are away. Each workspace gets its own computer, files and memory, in the cloud on Durable Objects or locally, and when you come back its work and pending decisions are waiting for you.",
  nimbus:
    "Nimbus gives agents free POSIX-like sandboxes on Durable Objects: a WASI runtime, a virtual file system paged from SQLite, and Python, Ruby and C running inside, at the edge.",
  dew:
    "FlaxDiff grew up into Dew: one JAX framework for training language models, diffusion models and JEPA encoders, from a single GPU to a TPU pod.\n\nDiffusion, world models, reinforcement learning: that's the direction I want to keep moving in.",
};

const VIT =
  "College gave the tinkering some structure. For a while the curiosity pointed at breaking things instead of building them: my friend Palash and I started GreyFang, a two-person CTF team that at one point ranked #7 in India. We took second at the Nullcon Goa hardware CTF in 2020 against university teams of ten, then went back in 2022 and won it.\n\nSecurity left me with a habit I still use: assume nothing, verify everything, and read the layer below the one you are debugging.";
const UMD =
  "In 2024 I went back to school for a Master's in Applied Machine Learning at the University of Maryland, for the depth I wanted. I worked on Diff2Lip 2, audio-guided diffusion lip-sync, running large ablation studies on the university's SLURM clusters. While I was studying, Dyte was acquired by Cloudflare.";

export const EXPERIENCE_STORIES: Record<string, string> = {
  vit: VIT,
  "eaf0515c-3715-4c2c-a138-38540c251a0d": VIT,
  hyperverge:
    "My first job was at HyperVerge in Bengaluru, as a deep-learning intern in my final year of college and then as an ML researcher. I trained computer-vision models on TPUs to tell a real face from a photo, a screen or a mask, work that supported the company's ISO 30107-3 certification.\n\nThe lesson that stayed was about research itself: progress is mostly an infrastructure problem. Once our pipelines could run 250+ experiments a week, the experiments could finally keep up with our questions.",
  dyte:
    "In 2021 I joined Dyte, a programmable video SDK startup, as one of its founding engineers. I was hired for ML, but soon ended up owning something bigger: designing and building Hive, our distributed WebRTC SFU and media infrastructure, from scratch in Go, and growing its load capacity about fifteenfold.\n\nThree years of scaling real-time video taught me more about production distributed systems than anything I could have read.",
  umd: UMD,
  "17fc1af8-ce45-40aa-8f95-a1647d2d0931": UMD,
  cloudflare:
    "I joined Cloudflare through an internship in Emerging Technologies & Incubation and converted to full time after graduating. There I created Seal, now Cloudflare OS: long-running background agents that live in sandboxed workspaces on Durable Objects and do real work, from engineering to operations.\n\nIt grew from a solo prototype into a platform with a dedicated team and thousands of users across the company. Underneath it sits Mossaic, the distributed file system I built for its storage.",
};
