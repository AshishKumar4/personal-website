# ashishkumarsingh.com

The personal site of Ashish Kumar Singh.

The homepage is a night flight over a mountain range: a hidden-line terrain rendered in raw WebGL2 that drifts forward on its own, carries you through the range as you scroll, follows the cursor, and reaches dawn at the contact section. Everything else stays quiet: Inter Tight and Inter, a single warm accent, and content set with plenty of room.

Content is managed from the admin panel (`/admin`): posts and notebooks, projects (with display order), experience, contact messages, the hero headline, portrait, about facts, accent colour, files, and 2FA security.

## Stack

React + Vite + Tailwind on the front end, Hono on Cloudflare Workers, Durable Objects for storage, R2 for images and files. The homepage entry chunk is small; every other route is lazy-loaded, and the homepage data arrives in a single preloaded request.

## Development

```sh
bun install
bun dev          # Vite + Workers on http://localhost:3000
bun run build
bun run lint
bun test
```

Optional Worker secrets: `TWO_FACTOR_KEY` (required for admin 2FA), `GITHUB_TOKEN` (raises the GitHub API rate limit for `/api/github`).

Pushes to `main` deploy through Cloudflare Workers Builds.
