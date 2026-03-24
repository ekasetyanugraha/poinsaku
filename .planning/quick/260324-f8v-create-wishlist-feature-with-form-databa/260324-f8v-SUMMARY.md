---
phase: quick
plan: 260324-f8v
subsystem: wishlist
tags: [wishlist, feature-toggle, landing-page, form, supabase]
dependency_graph:
  requires: []
  provides: [wishlist-form, wishlist-api, wishlist-db, wishlist-toggle]
  affects: [app/layouts/default.vue, app/pages/index.vue, nuxt.config.ts]
tech_stack:
  added: []
  patterns: [glassmorphism-form, runtime-config-toggle, service-role-insert, zod-validation]
key_files:
  created:
    - supabase/migrations/003_wishlist.sql
    - server/api/wishlist/index.post.ts
    - app/pages/wishlist.vue
  modified:
    - server/utils/validators.ts
    - app/layouts/default.vue
    - app/pages/index.vue
    - nuxt.config.ts
    - .env.example
decisions:
  - "Use #server/utils alias (not ~/server/utils) for Nitro server-side imports — matches existing project pattern"
  - "wishlistMode stored as string (empty = false, 'true' = enabled) in runtimeConfig.public for env var compatibility"
  - "wishlist_submissions uses RLS with no user policies — all writes go through service role API endpoint"
metrics:
  duration: "3 minutes"
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_created: 3
  files_modified: 5
---

# Quick Task 260324-f8v: Create Wishlist Feature Summary

**One-liner:** Pre-release wishlist collection with glassmorphism form at /wishlist, Supabase DB table, POST API endpoint, and NUXT_PUBLIC_WISHLIST_MODE env toggle for nav/CTA switching.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Database migration + API endpoint + validator schema | 7c2f872 | 003_wishlist.sql, validators.ts, index.post.ts |
| 2 | Wishlist page UI + feature toggle in navigation and landing page | ff9daca | wishlist.vue, default.vue, index.vue, nuxt.config.ts |

## What Was Built

### Database Layer
- `supabase/migrations/003_wishlist.sql`: Creates `wishlist_submissions` table with id (UUID PK), name, email, company, industry, message, created_at columns; RLS enabled with no user-facing policies (admin-only access)

### API Layer
- `server/api/wishlist/index.post.ts`: Anonymous POST endpoint; validates body with `wishlistSubmissionSchema`; inserts via service role client; returns `{ success: true }` with 201 on success, 400 on validation error, 500 on DB error

### Validator
- `server/utils/validators.ts`: Added `wishlistSubmissionSchema` — name (required, max 100), email (required, valid format), company (optional, max 100), industry (optional, max 100), message (optional, max 250)

### UI Layer
- `app/pages/wishlist.vue`: Standalone page (layout: false) with glassmorphism design matching login.vue; 5 fields (name, email, company, industry dropdown+custom text for "Lainnya", message with character counter); client-side validation; loading state; success state with check-circle icon
- `app/layouts/default.vue`: Added `isWishlistMode` computed; conditionally renders "Bergabung Wishlist" button (wishlist mode) or "Masuk" + "Daftar Gratis" links (normal mode)
- `app/pages/index.vue`: Added `isWishlistMode` computed; hero CTA and bottom CTA section conditionally switch between wishlist and register content
- `nuxt.config.ts`: Added `wishlistMode: ''` to `runtimeConfig.public`; added `/wishlist` to Supabase auth redirect exclude list
- `.env.example`: Added `NUXT_PUBLIC_WISHLIST_MODE=true` under App section

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed server-side import alias**
- **Found during:** Task 2 typecheck verification
- **Issue:** Used `~/server/utils/` alias which resolves correctly at runtime but fails TypeScript resolution in server API context
- **Fix:** Changed to `#server/utils/` which matches the Nitro server path alias used consistently across all other server API files
- **Files modified:** `server/api/wishlist/index.post.ts`
- **Commit:** ff9daca (included in Task 2 commit)

**2. [Rule 2 - Missing functionality] Added script section to default.vue**
- **Found during:** Task 2 IDE diagnostics (TypeScript error TS2339)
- **Issue:** `app/layouts/default.vue` had no `<script setup>` block; `isWishlistMode` was referenced in the template without being defined
- **Fix:** Added `<script setup lang="ts">` with `useRuntimeConfig()` and `isWishlistMode` computed property
- **Files modified:** `app/layouts/default.vue`
- **Commit:** ff9daca

## Self-Check: PASSED

- supabase/migrations/003_wishlist.sql — FOUND
- server/api/wishlist/index.post.ts — FOUND
- app/pages/wishlist.vue — FOUND
- Commit 7c2f872 (Task 1) — FOUND
- Commit ff9daca (Task 2) — FOUND
