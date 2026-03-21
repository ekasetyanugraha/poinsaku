---
phase: quick
plan: 260321-d2b
subsystem: deployment
tags: [cloudflare, nitro, workers, wrangler]
dependency_graph:
  requires: []
  provides: [cloudflare-pages-build]
  affects: [nuxt.config.ts, wrangler.toml, package.json, server/api/qr/generate.post.ts, server/api/vouchers/generate.post.ts, .env.example]
tech_stack:
  added: [wrangler (CLI tool for Cloudflare Pages deploy)]
  patterns: [cloudflare_pages nitro preset, nodejs_compat compatibility flag, node: ESM prefix for built-ins]
key_files:
  created: [wrangler.toml]
  modified: [nuxt.config.ts, package.json, server/api/qr/generate.post.ts, server/api/vouchers/generate.post.ts, .env.example]
decisions:
  - "nodejs_compat compatibility flag used instead of nodejs_als — broader compatibility for jsonwebtoken and @nuxtjs/supabase internal Node.js usage"
  - "pages_build_output_dir set to dist — Nuxt 4 / Nitro cloudflare_pages preset output directory"
  - "Secrets excluded from wrangler.toml — only public vars (NUXT_PUBLIC_APP_URL) included; all secrets go in Cloudflare dashboard"
metrics:
  duration: "~8min"
  completed: "2026-03-21"
---

# Quick Task 260321-d2b: Prepare for Deployment on Cloudflare Pages Summary

Cloudflare Pages deployment configured with `cloudflare_pages` Nitro preset, `nodejs_compat` Workers flag, and `node:crypto` ESM-prefixed imports across all server API files that use Node.js built-ins.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Configure Nitro cloudflare_pages preset and create wrangler.toml | 2eda87b | nuxt.config.ts, wrangler.toml, package.json |
| 2 | Fix Node.js module imports for Workers compatibility | 72ba0ae | server/api/qr/generate.post.ts, server/api/vouchers/generate.post.ts, .env.example |
| 3 | Verify build succeeds with cloudflare_pages preset | (no code change — build verified) | dist/_worker.js produced |

## What Was Built

- **`nuxt.config.ts`**: Added `nitro.preset = 'cloudflare_pages'` block.
- **`wrangler.toml`** (new): Cloudflare Pages configuration with `nodejs_compat` flag, `pages_build_output_dir = "dist"`, and public app URL var.
- **`package.json`**: Added `build:cf`, `deploy`, and `preview:cf` scripts for Cloudflare Pages workflow.
- **`server/api/qr/generate.post.ts`**: Changed `import crypto from 'crypto'` to `import crypto from 'node:crypto'`.
- **`server/api/vouchers/generate.post.ts`**: Changed `import crypto from 'crypto'` to `import crypto from 'node:crypto'`.
- **`.env.example`**: Added deployment comment block explaining that secrets must be configured in Cloudflare Pages dashboard or via `wrangler secret put`.

## Build Verification

`npx nuxt build` completed successfully with Nitro preset `cloudflare-pages`, producing:
- `dist/_worker.js/index.js` — Cloudflare Workers entry point
- `dist/_worker.js/chunks/` — all API routes compiled as Workers-compatible modules
- `dist/_routes.json`, `dist/_headers`, `dist/_redirects` — Cloudflare Pages routing config
- Total output: 2.38 MB (695 kB gzip)

## Decisions Made

1. **nodejs_compat flag**: Required because `jsonwebtoken` and `@nuxtjs/supabase` use Node.js built-in modules internally. Without this flag, the Worker would fail to resolve `crypto`, `stream`, `buffer`, and other built-ins at runtime.

2. **`node:` prefix on crypto imports**: Cloudflare Workers' `nodejs_compat` mode resolves Node.js built-ins when they use the `node:` ESM prefix. The bare `'crypto'` form may not resolve correctly in all Workers environments. Only `qr/generate.post.ts` and `vouchers/generate.post.ts` had bare crypto imports — `wallet/google.post.ts` and `wallet/samsung.post.ts` use `jsonwebtoken` (npm package, no prefix needed).

3. **Secrets excluded from wrangler.toml**: Only `NUXT_PUBLIC_APP_URL` (public, non-secret) is set in `[vars]`. All secrets (Supabase service role key, Apple/Google/Samsung credentials, QR token secret) must be configured via Cloudflare Pages dashboard or `wrangler secret put` — they are never committed to the repository.

4. **`dist` already in .gitignore**: The build output directory was already properly excluded. No changes to `.gitignore` were needed.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `nuxt.config.ts` contains `preset: 'cloudflare_pages'`
- [x] `wrangler.toml` exists with `nodejs_compat`
- [x] `server/api/qr/generate.post.ts` uses `node:crypto`
- [x] `server/api/vouchers/generate.post.ts` uses `node:crypto`
- [x] `nuxt build` succeeded, `dist/_worker.js` present
- [x] Commits 2eda87b and 72ba0ae exist

## Self-Check: PASSED
