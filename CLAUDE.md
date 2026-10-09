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
bun test           # Run unit tests (DOM tests register happy-dom per file)
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
- `/` - Homepage (Hero, About, chronological Timeline, Writing, Contact)
- `/about` - Long-form story rendered from `aboutStory` markdown
- `/blog`, `/blog/:slug` - Blog pages
- `/admin/*` - Admin panel (protected routes, includes `/admin/messages` for contact form submissions)

### Theme

- The public site (every `PortfolioLayout` page, including `/admin/login`) is always dark. Only the admin and mail apps follow the stored `theme` preference ("Paper mode" / "Ink mode")
- The layout that renders the page owns the `dark` class and `theme-color` through `useDocumentTheme`; `ThemeProvider` only stores the preference
- The pre-paint script in `index.html` applies a stored light preference only on `/admin` (not `/admin/login`) and `/mail` paths, to avoid a flash; `src/components/layout/theme.test.tsx` pins this

### Flight scene

- `src/lib/flight/` - lazy-loaded WebGL2 engine: `engine.ts` (loop, camera choreography), `scenes.ts` (7 scenes and the `[data-scene]` region tracker), `terrain-renderer.ts` + `glsl.ts` (procedural terrain, hidden-line fill plus row lines, sky), `particles.ts` (fireflies, city lights), `post.ts` (bloom, grain), `input.ts` (cursor lantern, click ripple), `terrain-js.ts` (CPU terrain height for picking), `bus.ts` (`pulse`, `focus`, `telemetry` events)
- `src/components/flight/FlightCanvas.tsx` - fixed background; every story region in the DOM declares `data-scene="<SceneId>"` and the engine sweeps between scenes as they cross the viewport centre; adjacent regions with the same scene merge
- Scenes: `night`, `kernel`, `breach`, `signal`, `noise`, `swarm`, `dawn` (`SCENE_IDS` in `shared/types.ts`)
- `motifs.ts` layers a subtle per-entry motif (e.g. `boot`, `ctf`, `lab`, `drone`, `clouds`, `dew`, `fog`) that can switch the terrain archetype (mirror lake, open plain, rolling hills, cloud sea, block build, mesas) plus a terrain variation from `data-seed` on top of the scene; timeline regions get both from `entryMotif`/`projectHue` in `timeline.ts`, and neighbours merge only when scene, motif and seed all match
- Debug params: `?scene=<id>&progress=0..1` forces a scene, `?motif=<id>&seed=0..1` forces a motif, `?flightq=hi` pins quality, `?freeze=<seconds>` freezes time for deterministic frames (and exposes `window.__flightBench`)
- `quality.ts` is the adaptive resolution controller (targets ~60fps, defers resizes until scrolling is idle); terrain is evaluated once per frame and shared by the fill, line and mirror passes, and every program is compiled and warmed up front so no world stalls on first appearance
- Opening shot: once per session on a fresh load of `/` at the top, the camera glides over a moonlit volumetric cloud sea (raymarched in `post.ts`), dives through it and flares out into the hero, always looking along its flight path (`choreo.ts` shapes the dive as a pure function of time; `intro-gate.ts` holds the hero name via `html[data-intro]` until the dive releases it; any scroll, key or touch aborts it; `?nointro` skips it)
- Respects `prefers-reduced-motion` (static frames) and adapts resolution to frame time; small screens get lower density and no bloom

### About

- `OriginsSection.tsx` sits right after the hero: one compact section with a short story (`SiteConfig.origins`, paragraphs separated by blank lines; admin: Settings, "Homepage About"; falls back to `DEFAULT_ORIGINS` in `shared/types.ts`), the portrait and a link to `/about`, flown over the `mind` world
- The `crystal`, `quantum` and `arena` worlds in `motifs.ts` are available for entries but not assigned by default

### Timeline

- `src/components/site/timeline.ts` merges experiences (start parsed from `duration`) and projects (`year`, `YYYY-MM`) oldest first; undated projects go last. Consecutive projects that start within about a month of each other become one `group` stop (one landscape, taken from the lowest `order` project, with the projects side by side)
- Each entry's scene is its `scene` field when set, otherwise a default by id in `timeline.ts`; both are editable in the admin ("Landscape", "Started")
- Each entry shows its `story` (first-person narrative, blank lines split paragraphs) and falls back to `description`; default stories live in `worker/entry-stories.ts` and are editable per entry in the admin
- Experiences show their `logoUrl` as a small glass tile next to the dates (`CompanyMark.tsx`), and the hero shows the current company's mark inline; curated marks live in `public/logos/`
- Every entry's text reveal is keyed to the top of its heading block (`useStageRegion` with `anchor: 'top'`), so long stories don't delay their own entrance
- Project media (`imageUrl`, optional `videoUrl` as a space-separated source list, curated assets in `public/projects/`) renders through `ProjectMedia.tsx` as a tone-tinted glass window that tilts in on scroll and comes to full colour on hover; `homepage` adds a live-site pill labelled with its domain (`project-links.ts`)
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