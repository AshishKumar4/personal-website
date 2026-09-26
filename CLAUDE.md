# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal site built around a night flight: the homepage is one chronological story (experiences and projects interleaved by start date) flown over a raw WebGL2 hidden-line mountain range whose landscape morphs per entry, ending at dawn by the contact section. It features a React frontend with a Cloudflare Workers backend using Durable Objects for persistent storage. The site includes a public portfolio, blog system, and admin panel.

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
- `/` - Homepage (Hero, chronological Timeline, Writing, Contact)
- `/about` - Long-form story rendered from `aboutStory` markdown
- `/blog`, `/blog/:slug` - Blog pages
- `/admin/*` - Admin panel (protected routes, includes `/admin/messages` for contact form submissions)

### Flight scene

- `src/lib/flight/` - lazy-loaded WebGL2 engine: `engine.ts` (loop, camera choreography), `scenes.ts` (7 scenes and the `[data-scene]` region tracker), `terrain-renderer.ts` + `glsl.ts` (procedural terrain, hidden-line fill plus row lines, sky), `particles.ts` (fireflies, city lights), `post.ts` (bloom, grain), `input.ts` (cursor lantern, click ripple), `terrain-js.ts` (CPU terrain height for picking), `bus.ts` (`pulse`, `focus`, `telemetry` events)
- `src/components/flight/FlightCanvas.tsx` - fixed background; every story region in the DOM declares `data-scene="<SceneId>"` and the engine sweeps between scenes as they cross the viewport centre; adjacent regions with the same scene merge
- Scenes: `night`, `kernel`, `breach`, `signal`, `noise`, `swarm`, `dawn` (`SCENE_IDS` in `shared/types.ts`)
- Debug params: `?scene=<id>&progress=0..1` forces a scene, `?flightq=hi` pins quality
- Respects `prefers-reduced-motion` (static frames) and adapts resolution to frame time; small screens get lower density and no bloom

### Timeline

- `src/components/site/timeline.ts` merges experiences (start parsed from `duration`) and projects (`year`, `YYYY-MM`) oldest first; undated projects go last
- Each entry's scene is its `scene` field when set, otherwise a default by id in `timeline.ts`; both are editable in the admin ("Landscape", "Started")
- Each entry shows its `story` (first-person narrative, blank lines split paragraphs) and falls back to `description`; default stories live in `worker/entry-stories.ts` and are editable per entry in the admin
- `worker/content-migration.ts` holds the project seeds and a one-time, marker-guarded migration that runs from the public read routes

### Public data

- `GET /api/home` returns config, experiences, projects and post summaries in one request (preloaded from `index.html`)
- `GET /api/github` returns repo stars/forks, follower count and the last push, cached at the edge for an hour; an optional `GITHUB_TOKEN` secret raises the rate limit
- `SiteConfig` optional fields (`portraitUrl`, `now` (hero headline), `location`, `facts`, `accent`) fall back to `DEFAULT_SITE_EXTRAS` in `shared/types.ts`

### UI Components

- `src/components/ui/` - shadcn/ui primitives (excluded from react-refresh lint rule)
- `src/components/sections/` - Portfolio page sections
- `src/components/site/` - Shared site pieces (timeline model, scroll stage, year rail, word reveals, post row, command menu)
- `src/components/reading/` - Masthead and type styles shared by About, Writing and post pages
- `src/components/layout/` - Layout wrappers (Header, Footer, PortfolioLayout, AdminLayout)

## Key Configuration

### ESLint

Custom rules prevent common React bugs:
- State setters called directly in render body trigger errors
- State setters in useMemo/useCallback are flagged

### Wrangler (wrangler.jsonc)

- Single `GlobalDurableObject` class handles all entity storage
- Assets serve as SPA with worker-first routing for `/api/*`

### Worker Previews

- Every non-production branch builds a [Worker Preview](https://developers.cloudflare.com/workers/previews/) via Workers Builds (`npx wrangler preview`), and the URL is posted on the pull request
- The `previews` block in `wrangler.jsonc` only redeclares the `GlobalDurableObject` binding (Previews do not inherit bindings, and without it every data route returns 500). Each Preview gets its own Durable Object storage seeded with default content, and no R2 or email bindings, so nothing in a Preview can touch production data
- Admin login stays blocked in Previews unless `TWO_FACTOR_KEY` is added to the Preview base config; do not add it, since Previews seed the default admin password
- `bun run preview:deploy` creates a Preview for the current branch from a local machine

Please dont add comments in any of the code files.