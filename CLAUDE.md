# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal site whose concept is "signal from noise": the page samples itself out of Gaussian noise with a real forward-process renderer (x_t = sqrt(abar_t) x_0 + sqrt(1 - abar_t) eps, cosine schedule) written in raw WebGL2. It features a React frontend with a Cloudflare Workers backend using Durable Objects for persistent storage. The site includes a public portfolio, blog system, and admin panel.

## Commands

```bash
bun install        # Install dependencies
bun dev            # Start dev server (Vite + Workers) on port 3000
bun run build      # Build for production
bun run lint       # Run ESLint (outputs JSON format)
bun deploy         # Build and deploy to Cloudflare
```

## Architecture

### Directory Structure

- `src/` - React frontend (Vite, Tailwind, shadcn/ui, Framer Motion)
- `worker/` - Cloudflare Workers backend (Hono framework)
- `shared/` - Shared TypeScript types used by both frontend and backend

### Path Aliases

- `@/` resolves to `src/`
- `@shared/` resolves to `shared/`

### Backend Entity System

The backend uses a custom entity framework built on Cloudflare Durable Objects (`worker/core-utils.ts`). Key classes:

- `Entity<State>` - Base class with CAS-based optimistic concurrency
- `IndexedEntity<State>` - Extends Entity with automatic indexing for list operations
- `Index<T>` - Prefix-based index stored in Durable Objects

Entities are defined in `worker/entities.ts`. To create a new entity:
1. Extend `IndexedEntity<YourType>` (or `Entity<YourType>` if listing isn't needed)
2. Define `entityName`, `indexName`, `initialState`, and optionally `seedData`

Routes are added in `worker/user-routes.ts`. Do NOT modify `worker/index.ts` or `worker/core-utils.ts`.

### Frontend Routing

Uses react-router-dom with routes defined in `src/main.tsx`. Only the homepage is in the entry chunk; every other route is lazy-loaded.
- `/` - Homepage (Hero, Model card, Training run, Samples, Notes, Contact sections)
- `/about` - Long-form story rendered from `aboutStory` markdown
- `/blog`, `/blog/:slug` - Blog pages
- `/admin/*` - Admin panel (protected routes, includes `/admin/messages` for contact form submissions)

### Diffusion engine

- `src/lib/diffusion/` - schedule math, WebGL2 `FieldRenderer`, Canvas2D x0 compositor, sampler store, favicon animation
- `src/components/diffusion/` - `HeroField`, `ScrollField`, `DenoiseImage`, `SamplerHud`, text effects
- Rendering is on demand: frames are only drawn while sampling, scrolling or reacting to the cursor

### Public data

- `GET /api/home` returns config, experiences, projects and post summaries in one request (preloaded from `index.html`)
- `GET /api/github` returns repo stars/forks, follower count and the last push, cached at the edge for an hour; an optional `GITHUB_TOKEN` secret raises the rate limit
- `SiteConfig` optional fields (`heroPrompt`, `portraitUrl`, `now`, `location`, `facts`, `accent`) fall back to `DEFAULT_SITE_EXTRAS` in `shared/types.ts`

### UI Components

- `src/components/ui/` - shadcn/ui primitives (excluded from react-refresh lint rule)
- `src/components/sections/` - Portfolio page sections
- `src/components/site/` - Shared site pieces (section header, post row, command menu, terminal easter egg)
- `src/components/layout/` - Layout wrappers (Header, Footer, PortfolioLayout, AdminLayout)

## Key Configuration

### ESLint

Custom rules prevent common React bugs:
- State setters called directly in render body trigger errors
- State setters in useMemo/useCallback are flagged

### Wrangler (wrangler.jsonc)

- Single `GlobalDurableObject` class handles all entity storage
- Assets serve as SPA with worker-first routing for `/api/*`

Please dont add comments in any of the code files.