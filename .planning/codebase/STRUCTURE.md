# Codebase Structure

**Analysis Date:** 2026-03-20

## Directory Layout

```
stampku/
├── app/                          # Nuxt frontend application
│   ├── pages/                    # File-based routing
│   ├── components/               # Reusable Vue components
│   ├── layouts/                  # Page layouts (default, dashboard, cashier)
│   ├── middleware/               # Route guards (auth, role)
│   ├── composables/              # Business logic composition functions
│   ├── types/                    # TypeScript type definitions
│   ├── assets/                   # Images, CSS, fonts
│   └── app.vue                   # Root component
├── server/                       # Nitro backend
│   ├── api/                      # REST endpoints
│   └── utils/                    # Shared helpers (auth, validators, supabase)
├── supabase/                     # Database setup
│   ├── migrations/               # SQL migration files
│   └── tests/                    # SQL function tests
├── tests/                        # Frontend & backend tests
│   └── unit/                     # Unit test files
├── public/                       # Static assets
├── .planning/                    # GSD planning documents
├── design-system/                # Custom design tokens (if any)
├── docs/                         # Documentation
├── nuxt.config.ts               # Nuxt configuration
├── package.json                  # Dependencies
├── tsconfig.json                # TypeScript config
└── tailwind.config.ts           # Tailwind CSS config
```

## Directory Purposes

**`app/`:**
- Purpose: Full frontend application (SSR-enabled Nuxt)
- Contains: Pages, layouts, components, composables, middleware
- Key files: `app.vue` (root), `nuxt.config.ts` (config)

**`app/pages/`:**
- Purpose: File-based routing (Nuxt convention)
- Dynamic routes: `[businessSlug]`, `[programId]`, `[customerProgramId]` as route params
- Public routes: index, join, card, register, login, staff/login
- Private routes: dashboard, cashier (protected by middleware)

**`app/components/`:**
- Purpose: Reusable Vue 3 components (no Nuxt auto-import: use explicit imports)
- Examples: `BranchFormModal.vue`, `ProgramQrModal.vue` (modal dialogs)

**`app/layouts/`:**
- Purpose: Layout wrappers for page groups
- `default.vue`: Public pages (landing, login, register)
- `dashboard.vue`: Owner/admin dashboard (sidebar nav, business switcher)
- `cashier.vue`: Staff transaction entry mode

**`app/middleware/`:**
- Purpose: Route guards (executed before page render)
- `auth.ts`: Checks Supabase auth status; redirects unauthenticated users to login
- `role.ts`: Not implemented; reserved for future role-based routing

**`app/composables/`:**
- Purpose: Reusable composition functions (business logic, API calls)
- Pattern: Each composable exports a function returning reactive data + actions
- Examples:
  - `useAuth()`: Current user + member role
  - `useBusiness()`: Business list, active business context
  - `useProgram()`: Programs CRUD
  - `useTransaction()`: Transaction listing + stamp/cashback operations
  - `usePermission()`: Permission checks (canManageMembers, canManageSettings)
- SSR-safe: Use `useFetch()` for server-side data fetching

**`app/types/`:**
- Purpose: TypeScript type definitions
- `database.types.ts`: Auto-generated from Supabase schema (run `npm run db:gen-types`)

**`server/api/`:**
- Purpose: RESTful API endpoints
- Pattern: Filenames define routes (Nitro convention)
  - `businesses/index.get.ts` → `GET /api/businesses`
  - `programs/[id].put.ts` → `PUT /api/programs/:id`
  - `transactions/stamp.post.ts` → `POST /api/transactions/stamp`
- Authorization: Each endpoint calls `requireUser()` or `requireMember()` at start
- Validation: Zod schemas parsed before processing
- Response: JSON objects or arrays

**`server/api/` Structure:**
```
server/api/
├── auth/                         # OAuth callback
├── businesses/                   # Business CRUD + ownership
├── branches/                     # Branch management (within business)
├── programs/                     # Program creation, config (stamp/membership)
├── customers/                    # Customer registration, lookup
├── members/                      # Staff membership (owners/admins/cashiers)
├── staff/                        # Staff account management (phase 2)
├── transactions/                 # Stamp, cashback, tier operations
├── qr/                          # QR generation & verification
├── vouchers/                    # Voucher CRUD & redemption
├── voucher-options/             # Voucher option templates
├── wallet/                      # Apple/Google/Samsung wallet integration
├── cards/                       # Card display endpoint
└── dashboard/                   # Dashboard stats
```

**`server/utils/`:**
- Purpose: Shared helper functions (not exposed as routes)
- `auth.ts`: `requireUser()`, `requireMember()`, `requireOwner()` middleware
- `validators.ts`: Zod schemas for all request types
- `supabase.ts`: Supabase client + admin auth helpers
- `business.ts`: Business-level query helpers (if any)

**`supabase/migrations/`:**
- Purpose: SQL migration files (version-controlled)
- Naming: `[timestamp]_[description].sql`
- Contain: CREATE TABLE, RLS policies, RPC functions
- Run via: `npm run db:migrate`

## Key File Locations

**Entry Points:**
- `app/app.vue`: Root Nuxt component (layout wrapper)
- `nuxt.config.ts`: Nuxt configuration (modules, plugins, build config)
- `server/api/*/`: API endpoints auto-mounted by Nitro

**Configuration:**
- `nuxt.config.ts`: Framework config, module setup (Supabase, Nuxt UI)
- `package.json`: Dependencies, build scripts
- `tsconfig.json`: TypeScript compiler options
- `tailwind.config.ts`: TailwindCSS theming
- `.env`: Environment variables (not version-controlled)

**Core Logic:**
- `app/composables/*.ts`: Business operations (fetch, create, update, delete)
- `server/api/*/*.ts`: Business logic + authorization
- `server/utils/auth.ts`: Permission checks
- `server/utils/validators.ts`: Input validation schemas

**Testing:**
- `tests/unit/*.ts`: Vitest unit tests (not extensive; run `npm run test`)
- `supabase/tests/`: SQL function tests

## Naming Conventions

**Files:**
- Pages: `[route].vue` or `[param].vue` (kebab-case route params become PascalCase in URLs)
  - Example: `[businessSlug].vue` accepts `:businessSlug` route param
- Components: PascalCase, descriptive names
  - Example: `BranchFormModal.vue`, `ProgramQrModal.vue`
- Composables: camelCase, `use*` prefix
  - Example: `useAuth.ts`, `useProgram.ts`, `useBusiness.ts`
- API endpoints: kebab-case for multi-word routes; dynamic params in `[brackets]`
  - Example: `stamp-add.post.ts`, `[id].get.ts`
- Schemas: camelCase, `*Schema` suffix
  - Example: `businessSchema`, `programBaseSchema`, `customerRegisterSchema`

**Directories:**
- Lowercase, singular or plural as appropriate
- `api/` for API routes, `composables/` for composition functions, `middleware/` for guards
- Resource-based naming: `businesses/`, `programs/`, `transactions/`

## Where to Add New Code

**New Feature (e.g., "Add tier upgrade"):**
1. Create API endpoint: `server/api/transactions/upgrade-tier.post.ts`
   - Import schemas from `server/utils/validators.ts`
   - Call `requireMember()` for authorization
   - Use `getServiceClient(event)` for database access
2. Create composable: `app/composables/useTransaction.ts` (or extend existing)
   - Export async action function: `upgradeTier(data: {...})`
   - Return as part of composable export
3. Create/extend page: `app/pages/dashboard/[businessSlug]/programs/[id].vue`
   - Import composable: `const { upgradeTier } = useTransaction()`
   - Call action on user interaction, handle errors with `useToast()`
4. Add test (optional): `tests/unit/upgrade-tier.spec.ts`

**New Component/Modal:**
1. Create component: `app/components/TierUpgradeModal.vue`
   - Props: receives data, emits success/cancel events
   - No API calls; parent page handles data fetching
2. Import in page: `<TierUpgradeModal v-if="showModal" @confirm="handleUpgrade" />`

**New Validation:**
1. Add schema to `server/utils/validators.ts`
   - Export as `upgradeSchema`
   - Use in API endpoint: `const data = upgradeSchema.parse(body)`

**New Composable (shared business logic):**
1. Create `app/composables/useNewFeature.ts`
2. Export function returning reactive data + actions:
   ```typescript
   export function useNewFeature() {
     const { data, refresh } = useFetch('/api/...')
     async function doSomething() { ... }
     return { data, doSomething }
   }
   ```
3. Use in pages: `const { data, doSomething } = useNewFeature()`

## Special Directories

**`app/middleware/`:**
- Purpose: Route guards (execute before page component mounts)
- Generated: Not auto-imported; explicitly applied via `definePageMeta()`
- Committed: Yes

**`.planning/`:**
- Purpose: GSD planning documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: No
- Committed: Yes (planning docs are version-controlled)

**`.nuxt/` & `.output/`:**
- Purpose: Build artifacts (dev/production builds)
- Generated: Yes (via `nuxt build` or `nuxt dev`)
- Committed: No (in .gitignore)

**`node_modules/`:**
- Purpose: Installed dependencies
- Generated: Yes (via `npm install`)
- Committed: No (in .gitignore)

**`supabase/.branches/` & `supabase/.temp/`:**
- Purpose: Local Supabase CLI state
- Generated: Yes (by Supabase local development)
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-03-20*
