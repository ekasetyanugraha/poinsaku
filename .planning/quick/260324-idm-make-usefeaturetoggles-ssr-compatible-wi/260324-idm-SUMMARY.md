# Quick Task 260324-idm: Make useFeatureToggles SSR-compatible

## What Changed

**File:** `app/composables/useFeatureToggles.ts`

Replaced manual `$fetch` + `import.meta.client` guard with `useFetch` so toggles are fetched during SSR and hydrated to the client.

### Before
- `$fetch` inside a manual `fetchToggles()` function
- `import.meta.client` guard prevented any server-side execution
- `isEnabled()` always returned `false` during SSR
- Realtime listener manually updated the local `togglesMap` state

### After
- `useFetch('/api/feature-toggles', { key: 'feature-toggles' })` runs on both SSR and client
- `togglesMap` is a `computed` derived from `useFetch` response data
- `isEnabled()` returns correct values during SSR (no content flash)
- Realtime listener calls `fetchToggles()` (the `refresh` from `useFetch`) to re-fetch on changes — simpler, no manual state patching

## Commits

| Hash | Description |
|------|-------------|
| 64b7f66 | feat(quick-260324-idm): make useFeatureToggles SSR-compatible with useFetch |
