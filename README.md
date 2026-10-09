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

Optional Worker secrets: `TWO_FACTOR_KEY` (required for admin 2FA), `GITHUB_TOKEN` (raises the GitHub API rate limit for `/api/github`), `ADMIN_RECOVERY_PASSWORD` (account recovery, below).

## Admin recovery

If you lose the admin password and every second factor:

1. Run `bunx wrangler secret put ADMIN_RECOVERY_PASSWORD` and type a new, strong password at the prompt.
2. Sign in at `/admin/login` as `admin` with that password. This replaces the old password, removes all second factors and sessions, and opens 2FA setup. Save the new backup codes.
3. Run `bunx wrangler secret delete ADMIN_RECOVERY_PASSWORD`.

Each recovery password works once. Signing in with the same value again does not remove the new second factor. Failed sign-ins still count toward the 15-minute lockout. Recovery leaves API tokens alone; they expire within 24 hours, and you can revoke them under Security.

Pushes to `main` deploy through Cloudflare Workers Builds.
