---
phase: quick-260324-i2p
plan: "01"
subsystem: feature-toggles
tags: [superadmin, feature-toggles, api, modal, form]
dependency_graph:
  requires: [260324-hqz]
  provides: [CREATE-TOGGLE]
  affects: [app/pages/dashboard/feature-toggles.vue]
tech_stack:
  added: []
  patterns: [UModal-inline-form, zod-validation, $fetch-POST, auto-slug-generation]
key_files:
  created:
    - server/api/feature-toggles/index.post.ts
  modified:
    - server/utils/validators.ts
    - app/pages/dashboard/feature-toggles.vue
decisions:
  - label field appears before key in the form so auto-generation is visible immediately
  - description sent as undefined (not empty string) when blank to match nullable DB column
metrics:
  duration: "~4 min"
  completed: "2026-03-24"
  tasks: 2
  files: 3
---

# Phase quick-260324-i2p Plan 01: Create Feature Toggle Summary

**One-liner:** POST API endpoint guarded by requireSuperAdmin plus an inline UModal form on the feature-toggles dashboard page that auto-generates the toggle key from the label.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Add POST API endpoint and validation schema | 0ec47dd | server/api/feature-toggles/index.post.ts, server/utils/validators.ts |
| 2 | Add create toggle button and modal form | 8129092 | app/pages/dashboard/feature-toggles.vue |

## What Was Built

**server/utils/validators.ts** — Added `featureToggleCreateSchema` using zod: key (alphanumeric + underscores, 1–100 chars), label (1–100 chars), description (optional, max 500), enabled (boolean, defaults to false).

**server/api/feature-toggles/index.post.ts** — POST endpoint that:
- Calls `requireSuperAdmin(event)` first (returns 403 for non-superadmins)
- Validates body with `featureToggleCreateSchema.safeParse`
- Inserts into `feature_toggles` table via service client
- Returns 409 on Postgres error code 23505 (unique key conflict) with "Toggle with this key already exists"
- Returns inserted row as `{ success: true, data }`

**app/pages/dashboard/feature-toggles.vue** — Added:
- Flex header layout with "Tambah Toggle" UButton (i-lucide-plus icon)
- `showCreateModal`, `createForm`, `creating` reactive state
- `watch(createForm.label)` — auto-generates key as snake_case from label
- `watch(showCreateModal)` — resets form fields on close
- `handleCreate()` — POSTs to `/api/feature-toggles`, closes modal, calls `refresh()`, shows success toast; shows error toast with API message on failure
- UModal with #body (form: label → key → description → enabled switch) and #footer (Batal / Simpan with loading state)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `server/api/feature-toggles/index.post.ts` exists
- [x] `server/utils/validators.ts` contains `featureToggleCreateSchema`
- [x] `app/pages/dashboard/feature-toggles.vue` contains `UModal` and `showCreateModal`
- [x] Commits 0ec47dd and 8129092 present in git log
- [x] No TypeScript errors in modified files (pre-existing errors in unrelated files only)

## Self-Check: PASSED
