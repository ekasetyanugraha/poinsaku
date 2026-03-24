---
phase: quick-260324-hqz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/005_feature_toggles.sql
  - server/api/feature-toggles/index.get.ts
  - server/api/feature-toggles/[key].patch.ts
  - server/utils/validators.ts
  - app/composables/useFeatureToggles.ts
  - app/pages/dashboard/feature-toggles.vue
  - app/layouts/dashboard.vue
  - app/layouts/default.vue
  - app/pages/index.vue
  - app/middleware/role.ts
  - nuxt.config.ts
autonomous: true
requirements: [FEAT-TOGGLE]

must_haves:
  truths:
    - "Superadmin can see all feature toggles with their current state on the Feature Toggles page"
    - "Superadmin can toggle a feature on/off and the change persists in the database"
    - "When a toggle is changed, the app immediately reflects the new state without page reload (via Supabase Realtime)"
    - "Non-superadmin users cannot access the Feature Toggles management page"
    - "The existing wishlist_mode toggle works identically to the previous env-var behavior"
  artifacts:
    - path: "supabase/migrations/005_feature_toggles.sql"
      provides: "feature_toggles table with key, enabled, label, description columns"
      contains: "CREATE TABLE feature_toggles"
    - path: "server/api/feature-toggles/index.get.ts"
      provides: "GET all toggles (public, no auth required — client needs toggle state)"
    - path: "server/api/feature-toggles/[key].patch.ts"
      provides: "PATCH toggle state (superadmin only)"
    - path: "app/composables/useFeatureToggles.ts"
      provides: "Client composable with Supabase Realtime subscription for instant updates"
    - path: "app/pages/dashboard/feature-toggles.vue"
      provides: "Superadmin management page for toggles"
  key_links:
    - from: "app/composables/useFeatureToggles.ts"
      to: "/api/feature-toggles"
      via: "useFetch on mount, then Supabase Realtime subscription for live updates"
      pattern: "useFetch.*feature-toggles"
    - from: "app/pages/dashboard/feature-toggles.vue"
      to: "/api/feature-toggles/[key]"
      via: "$fetch PATCH to toggle state"
      pattern: "\\$fetch.*feature-toggles"
    - from: "app/layouts/default.vue"
      to: "useFeatureToggles"
      via: "composable replaces useRuntimeConfig().public.wishlistMode"
      pattern: "useFeatureToggles|isEnabled"
---

<objective>
Create a database-driven feature toggles system managed by superadmins, replacing the current env-var approach.

Purpose: Allow superadmins to enable/disable features (like wishlist mode) at runtime without redeployment. Changes reflect immediately across all connected clients via Supabase Realtime.

Output: Migration file, API endpoints, composable with realtime, management page, and migration of existing wishlist_mode from env to DB.
</objective>

<execution_context>
@/Users/ekasetyanugraha/.claude/get-shit-done/workflows/execute-plan.md
@/Users/ekasetyanugraha/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@server/utils/auth.ts (requireSuperAdmin pattern)
@server/utils/supabase.ts (getServiceClient pattern)
@server/utils/validators.ts (zod schema patterns)
@server/api/wishlist/index.get.ts (superadmin API pattern)
@app/composables/useAuth.ts (composable pattern)
@app/composables/usePermission.ts (isSuperAdmin pattern)
@app/layouts/dashboard.vue (sidebar navigation, Super Admin section)
@app/layouts/default.vue (current wishlistMode usage)
@app/pages/index.vue (current wishlistMode usage)
@app/pages/dashboard/wishlists.vue (superadmin page pattern)
@app/middleware/role.ts (route guard pattern)
@nuxt.config.ts (runtimeConfig with wishlistMode)
@supabase/migrations/004_superadmin_role.sql (migration naming pattern)

<interfaces>
<!-- Key types and contracts the executor needs -->

From server/utils/auth.ts:
```typescript
export async function requireSuperAdmin(event: H3Event): Promise<User>
```

From server/utils/supabase.ts:
```typescript
export function getServiceClient(event: H3Event): SupabaseClient
```

From app/composables/usePermission.ts:
```typescript
export function usePermission(): {
  isSuperAdmin: ComputedRef<boolean>
  // ... other permissions
}
```

From app/layouts/dashboard.vue (Super Admin sidebar section, lines 68-75):
```html
<div v-if="isSuperAdmin" class="px-3 py-1 shrink-0 border-t border-gray-100 dark:border-gray-800">
  <p class="px-2.5 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Super Admin</p>
  <NuxtLink to="/dashboard/wishlists" ...>Wishlists</NuxtLink>
</div>
```

Current wishlistMode pattern (to be replaced):
```typescript
// nuxt.config.ts
runtimeConfig: { public: { wishlistMode: process.env.NUXT_PUBLIC_WISHLIST_MODE === 'true' } }

// Consumed in default.vue and index.vue as:
const config = useRuntimeConfig()
const isWishlistMode = computed(() => config.public.wishlistMode)
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Database migration and server API endpoints</name>
  <files>
    supabase/migrations/005_feature_toggles.sql,
    server/api/feature-toggles/index.get.ts,
    server/api/feature-toggles/[key].patch.ts,
    server/utils/validators.ts
  </files>
  <action>
    1. Create migration `supabase/migrations/005_feature_toggles.sql`:
       - CREATE TABLE `feature_toggles` with columns:
         - `id` UUID DEFAULT gen_random_uuid() PRIMARY KEY
         - `key` TEXT UNIQUE NOT NULL (e.g., 'wishlist_mode')
         - `enabled` BOOLEAN NOT NULL DEFAULT false
         - `label` TEXT NOT NULL (human-readable name, e.g., 'Wishlist Mode')
         - `description` TEXT (optional explanation)
         - `updated_at` TIMESTAMPTZ DEFAULT now()
         - `created_at` TIMESTAMPTZ DEFAULT now()
       - Add an updated_at trigger (CREATE OR REPLACE FUNCTION + trigger) to auto-update `updated_at` on row change
       - Seed the initial toggle: INSERT INTO feature_toggles (key, enabled, label, description) VALUES ('wishlist_mode', false, 'Wishlist Mode', 'Tampilkan form wishlist dan sembunyikan login/register di landing page')
       - Enable Supabase Realtime on the table: `ALTER PUBLICATION supabase_realtime ADD TABLE feature_toggles;`
       - Add RLS: enable RLS, add policy for SELECT (anon + authenticated can read), no INSERT/UPDATE/DELETE policies (writes go through service role in API)

    2. Create `server/api/feature-toggles/index.get.ts`:
       - NO auth required (public endpoint — client needs toggle state on every page load including unauthenticated pages like landing)
       - Use `getServiceClient(event)` to bypass RLS (service role)
       - SELECT all from feature_toggles ordered by key ASC
       - Return `{ data: toggles }`

    3. Create `server/api/feature-toggles/[key].patch.ts`:
       - Use `requireSuperAdmin(event)` for auth
       - Read `key` from route params via `getRouterParam(event, 'key')`
       - Read body and validate with zod schema: `{ enabled: z.boolean() }`
       - Use `getServiceClient(event)` to UPDATE feature_toggles SET enabled = body.enabled WHERE key = params.key
       - If no row updated (count === 0), throw 404 'Toggle not found'
       - Return `{ success: true, key, enabled }`

    4. Add to `server/utils/validators.ts`:
       - Add `featureToggleUpdateSchema = z.object({ enabled: z.boolean() })` after the wishlist schema section
  </action>
  <verify>
    <automated>cd /Users/ekasetyanugraha/personal-projects/fide-cards && cat supabase/migrations/005_feature_toggles.sql && cat server/api/feature-toggles/index.get.ts && cat server/api/feature-toggles/\[key\].patch.ts && grep -n "featureToggleUpdate" server/utils/validators.ts</automated>
  </verify>
  <done>
    - Migration file creates feature_toggles table with realtime enabled and RLS policies
    - GET /api/feature-toggles returns all toggles (public)
    - PATCH /api/feature-toggles/:key updates toggle (superadmin only)
    - Zod schema validates the update payload
  </done>
</task>

<task type="auto">
  <name>Task 2: Client composable with Realtime, management page, and migration from env toggle</name>
  <files>
    app/composables/useFeatureToggles.ts,
    app/pages/dashboard/feature-toggles.vue,
    app/layouts/dashboard.vue,
    app/layouts/default.vue,
    app/pages/index.vue,
    app/middleware/role.ts,
    nuxt.config.ts
  </files>
  <action>
    1. Create `app/composables/useFeatureToggles.ts`:
       - Use a global shared state pattern (useState or a module-level ref) so all components share the same toggle data
       - On first call: `useFetch('/api/feature-toggles')` to load initial state, store as a reactive Map/record keyed by toggle `key`
       - Subscribe to Supabase Realtime: `useSupabaseClient().channel('feature-toggles').on('postgres_changes', { event: '*', schema: 'public', table: 'feature_toggles' }, (payload) => { update the local reactive state })`. This is allowed per CLAUDE.md architecture rules (Supabase Realtime websocket subscriptions are the exception to the "no direct Supabase" rule).
       - Unsubscribe on component unmount via `onUnmounted` or use a ref-counted approach
       - Export: `useFeatureToggles()` returning `{ toggles, isEnabled(key: string): boolean, loading }`
       - `isEnabled` returns `toggles[key]?.enabled ?? false`
       - IMPORTANT: Use `useSupabaseClient` (not `useSupabaseUser`) for the Realtime channel — this works for both authenticated and unauthenticated users since the RLS SELECT policy allows anon

    2. Create `app/pages/dashboard/feature-toggles.vue`:
       - `definePageMeta({ layout: 'dashboard', middleware: ['auth', 'role'] })`
       - Fetch toggles from `/api/feature-toggles` using `useFetch`
       - Display as a list of cards (matching existing dashboard style, see wishlists.vue pattern)
       - Each card shows: label, description, and a `USwitch` bound to enabled state
       - On switch toggle: call `$fetch('/api/feature-toggles/{key}', { method: 'PATCH', body: { enabled: newValue } })`
       - Show loading spinner while fetching, empty state if no toggles
       - Show toast (via `useToast()`) on success/error after toggle
       - UI language: Indonesian (matching the rest of the app — "Feature Toggles" as title, "Aktif"/"Nonaktif" for status)

    3. Update `app/layouts/dashboard.vue` (Super Admin section, around line 69-75):
       - Add a new NuxtLink below the existing "Wishlists" link:
         ```html
         <NuxtLink to="/dashboard/feature-toggles" class="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-accented cursor-pointer" active-class="bg-primary-500/10 text-primary-500" @click="sidebarOpen = false">
           <UIcon name="i-lucide-toggle-right" class="size-4" />
           Feature Toggles
         </NuxtLink>
         ```

    4. Update `app/middleware/role.ts`:
       - Add route guard for feature-toggles page (same pattern as wishlists):
         ```typescript
         if (to.path.includes('/dashboard/feature-toggles') && role.value !== 'superadmin') {
           return navigateTo('/dashboard/business')
         }
         ```

    5. Update `app/layouts/default.vue`:
       - Replace `const config = useRuntimeConfig()` and `const isWishlistMode = computed(() => config.public.wishlistMode)` with:
         ```typescript
         const { isEnabled } = useFeatureToggles()
         const isWishlistMode = computed(() => isEnabled('wishlist_mode'))
         ```

    6. Update `app/pages/index.vue`:
       - Replace `const config = useRuntimeConfig()` and `const isWishlistMode = computed(() => config.public.wishlistMode)` with:
         ```typescript
         const { isEnabled } = useFeatureToggles()
         const isWishlistMode = computed(() => isEnabled('wishlist_mode'))
         ```

    7. Update `nuxt.config.ts`:
       - Remove `wishlistMode: process.env.NUXT_PUBLIC_WISHLIST_MODE === 'true'` from `runtimeConfig.public`
       - Keep the `appUrl` entry in `runtimeConfig.public` (do not remove it)
       - NOTE: Do NOT remove NUXT_PUBLIC_WISHLIST_MODE from .env.example yet — it becomes dead config but leave a comment "# Deprecated: now managed via Feature Toggles in Super Admin dashboard"
  </action>
  <verify>
    <automated>cd /Users/ekasetyanugraha/personal-projects/fide-cards && npx nuxi typecheck 2>&1 | tail -20</automated>
  </verify>
  <done>
    - useFeatureToggles composable provides reactive toggle state with Supabase Realtime subscription
    - Feature Toggles page renders toggle list with USwitch for each feature
    - Sidebar shows "Feature Toggles" link under Super Admin section
    - Route guard blocks non-superadmin access to /dashboard/feature-toggles
    - Landing page (default.vue + index.vue) uses DB-driven toggle instead of env var
    - nuxt.config.ts no longer has wishlistMode in runtimeConfig
    - Toggle changes by superadmin reflect immediately on all connected clients without page reload
  </done>
</task>

</tasks>

<verification>
1. Apply migration: `bunx supabase db reset` or manually apply 005_feature_toggles.sql
2. Start dev server: `bun run dev`
3. As superadmin: navigate to /dashboard/feature-toggles, verify toggles visible
4. Toggle "Wishlist Mode" ON — landing page should immediately show "Bergabung Wishlist" button
5. Toggle "Wishlist Mode" OFF — landing page should immediately revert to "Masuk" + "Daftar Gratis"
6. As non-superadmin: verify /dashboard/feature-toggles redirects to /dashboard/business
7. Open two browser tabs: toggle in one, confirm the other updates without reload (Realtime)
</verification>

<success_criteria>
- feature_toggles table exists with wishlist_mode seed row
- GET /api/feature-toggles returns all toggles (public, no auth)
- PATCH /api/feature-toggles/:key requires superadmin, updates enabled state
- Superadmin dashboard page lists toggles with functional switches
- Toggle state changes propagate to all clients in real-time via Supabase Realtime
- Existing wishlist mode behavior unchanged (just powered by DB instead of env var)
- No env var needed for feature toggles anymore
</success_criteria>

<output>
After completion, create `.planning/quick/260324-hqz-create-feature-toggles-table-managed-by-/260324-hqz-SUMMARY.md`
</output>
