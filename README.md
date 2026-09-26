# ashishkumarsingh.com — signal from noise

The personal site of Ashish Kumar Singh. The page samples itself from Gaussian noise: on load, a WebGL2 renderer draws the marginals q(x_t | x_0) from t = 1000 down to 0 in 60 steps on a cosine schedule (the trajectory a perfect denoiser would follow with DDIM) until his name and portrait resolve, and scrolling re-noises it. The rest of the site follows the same idea.

- **Hero**: a live sampler with a HUD showing `t`, `σ_t`, the step, the seed, an x̂₀ preview and the noise schedule. Move the cursor to inject noise locally; press resample for a new seed.
- **Model card** (about): the abstract resolves as you scroll, next to an interactive forward-process widget.
- **Training run** (experience): each role is a checkpoint on a loss curve with a warm restart per job.
- **Samples** (projects): images denoise into view and re-noise on hover; projects without images get a generative placeholder. Live GitHub stars.
- **Notes** (writing), a long-form `/about` story with chapters, and a contact form whose banner denoises as you scroll to it.
- Easter eggs: `⌘K` command menu, <kbd>`</kbd> opens `aqsh`, a small shell in memory of Aqeous OS, and the favicon denoises too.

Content is managed from the admin panel (`/admin`): posts and notebooks, projects (with display order), experience, contact messages, hero prompt, portrait, model-card facts, accent colour, files, and 2FA security.

## Stack

React + Vite + Tailwind on the front end, Hono on Cloudflare Workers, Durable Objects for storage, R2 for images and files. The diffusion renderer is dependency-free WebGL2 with a Canvas2D fallback, renders only on demand, and respects `prefers-reduced-motion`.

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
