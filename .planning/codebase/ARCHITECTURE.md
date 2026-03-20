# Architecture

**Analysis Date:** 2026-03-20

## Pattern Overview

**Overall:** Nuxt 4 full-stack isomorphic application with clear separation between PWA frontend (Vue 3 composition API) and Nitro backend API layer. All frontend data operations go through REST API endpoints; direct Supabase access is restricted to authentication and realtime subscriptions.

**Key Characteristics:**
- Isomorphic Nuxt framework unifies SSR with single router and SSR-safe composables
- Typed validation using Zod for all API request/response contracts
- Role-based access control (RBAC) at both frontend middleware and API authorization layers
- Progressive enhancement: public pages (join, card display) alongside authenticated dashboard and cashier modes
- Event-driven transaction system with polymorphic transaction types (stamp_add, stamp_redemption, cashback_earn, etc.)

## Layers

**Frontend (Vue 3 + Nuxt):**
- Purpose: User interfaces for three personas (customer, business owner/admin, cashier staff)
- Location: `app/`
- Contains: Page components, layouts, composables, middleware, type definitions
- Depends on: API layer, Supabase Auth
- Used by: Browser clients (PWA)

**API Layer (Nitro):**
- Purpose: Business logic, authorization, data persistence coordination
- Location: `server/api/`, `server/utils/`
- Contains: RESTful endpoints, auth helpers, validation schemas, Supabase client wrappers
- Depends on: Supabase backend (PostgreSQL + Auth)
- Used by: Frontend via `$fetch()` composable method

**Database (Supabase PostgreSQL):**
- Purpose: Persistent data storage with RLS policies
- Location: `supabase/migrations/`, `app/types/database.types.ts`
- Contains: Tables, RPC functions, policies, Edge Functions (future)
- Depends on: None
- Used by: API layer via Supabase client

**Authentication (Supabase Auth):**
- Purpose: User identity and session management
- Implements: Email/password auth with admin API for staff account creation
- Flow: Frontend login → Supabase Auth → JWT in HttpOnly cookie → API user verification

## Data Flow

**Customer Registration Flow:**

1. Customer clicks "Daftar" on public program join page (`app/pages/join/[programId].vue`)
2. Submits phone + name to `/api/customers/register` (POST)
3. API validates against `customerRegisterSchema` (phone format, program exists, is_active)
4. Creates or retrieves customer by phone (`customers` table)
5. Creates `customer_business_enrollments` record
6. Creates `customer_programs` enrollment with branch resolution
7. Creates extension record based on program type:
   - Stamp: `customer_stamp_progress` (tracks `current_stamps`)
   - Membership: `customer_membership_state` (tracks `current_tier_id`, `cashback_balance`)
8. Returns `customer_id` and `customer_program_id`
9. Frontend generates QR containing `{t: qrToken, cp: customerProgramId}`

**Business Owner Workflow:**

1. Owner logs in at `/login` with email/password (Supabase Auth)
2. Middleware checks auth status and redirects authenticated users
3. Composable `useAuth()` fetches `/api/staff/me` to resolve role
4. Role 'owner'/'admin' → redirect to `/dashboard/${businessSlug}`
5. Role 'cashier' → redirect to `/cashier`
6. Dashboard layout loads businesses via `/api/businesses` (uses RPC `get_member_access`)
7. Business switcher uses route param `businessSlug` to set active business context
8. All subsequent API calls include `business_id` query param for authorization

**Program Creation Flow:**

1. Owner navigates to `/dashboard/${businessSlug}/programs/new`
2. Two-step form: (1) select program type (stamp/membership), (2) configure
3. Submits to `/api/programs` (POST) with:
   - Base config: name, description, scope_type, scope_id, colors
   - Type-specific: `stamp_config` or `membership_config + tiers`
4. API validates all schemas, then:
   - Inserts base `programs` record
   - Inserts into `program_stamp_config` OR `program_membership_config` + `membership_tiers`
   - On schema error: rolls back (deletes program via CASCADE)
   - Returns full program with nested config/tiers

**Cashier Transaction Flow:**

1. Cashier at `/cashier` scans QR or enters code manually
2. Verification sends `{token, customer_program_id}` to `/api/qr/verify`
3. API decrypts token, validates freshness, returns customer + current program state
4. Cashier sees customer card with:
   - Stamps (if stamp program): current count
   - Membership (if membership): tier, cashback balance, total spend
5. Cashier selects action:
   - **Stamp**: Add 1-10 stamps → `/api/transactions/stamp` → increments `current_stamps`
   - **Redemption**: Click "Tukarkan Hadiah" → `/api/transactions/redeem-stamps` → resets stamps to 0
   - **Membership**: Enter amount → `/api/transactions/cashback` → earns cashback, checks tier upgrade
6. All transactions create `transactions` record with polymorphic `type` field

**State Management:**

- Vue reactive composables (`useProgram`, `useBusiness`, `useTransaction`)
- Composables use `useFetch()` for server-side data fetching (SSR-safe)
- Computed watch on dependencies (e.g., `activeBusinessId`) triggers refetch
- Client-side mutations via `$fetch()` with method POST/PUT/DELETE
- No Vuex/Pinia: state is local ref + computed or fetched server-side

## Key Abstractions

**Composables (Business Logic):**
- `useAuth()` - Current user + member record (role, scope)
- `useBusiness()` - Businesses list, active business context, CRUD
- `useProgram()` - Programs list, fetch, create, update, delete
- `useBranch()` - Branches CRUD, scope-specific queries
- `useTransaction()` - Transaction listing with filters, stamp/cashback/tier operations
- `useCustomer()` - Customer lookup, enrollment status
- `useMember()` - Staff management (create, deactivate, reassign)
- `usePermission()` - Derived permissions (canManageMembers, canManageSettings)
- `useVoucher()` - Voucher redemption, generation
- Location: `app/composables/*.ts`
- Pattern: Wrapper around API endpoints; returns reactive data + action functions

**Authorization (API Layer):**
- `requireUser(event)` - Asserts authenticated session, returns User object
- `requireMember(event, businessId, {roles})` - Asserts business membership + role
- `requireOwner(event, businessId)` - Shorthand for owner-only check
- Location: `server/utils/auth.ts`
- Pattern: Called at start of each endpoint to authorize before touching data

**Validation (Zod Schemas):**
- `businessSchema`, `branchSchema`, `memberSchema` - Entity creation
- `stampConfigSchema`, `membershipConfigSchema`, `tierSchema` - Program config
- `stampAddSchema`, `cashbackEarnSchema`, etc. - Transaction request validation
- `createStaffSchema`, `resetPasswordSchema`, `updateStatusSchema` - Staff management
- Location: `server/utils/validators.ts`
- Pattern: Parsed before processing; ZodError formatted as structured feedback to UI

**Supabase Helpers (Database Access):**
- `getServiceClient(event)` - Service role client (bypass RLS for admin operations)
- `createAuthUser(email, password, metadata)` - Staff account creation via admin API
- `deleteAuthUser(authUserId)` - Staff deactivation (hard delete)
- `banAuthUser(authUserId)` - Ban user (10 years) instead of delete (soft deactivation)
- `unbanAuthUser(authUserId)` - Lift ban (reactivate)
- `updateAuthUserPassword(authUserId, password)` - Password reset
- Location: `server/utils/supabase.ts`
- Pattern: Wraps Supabase admin auth API with error handling

## Entry Points

**Frontend Entry (PWA):**
- Location: `app/app.vue` + `nuxt.config.ts`
- Triggers: Browser navigation to `http://localhost:8989`
- Responsibilities:
  - Layout wrapper (UApp from @nuxt/ui)
  - Supabase client initialization (auto via @nuxtjs/supabase module)
  - Route-based page rendering

**Public Pages (No Auth Required):**
- `/` - Landing page (`app/pages/index.vue`)
- `/join/[programId]` - Customer enrollment form (`app/pages/join/[programId].vue`)
- `/card/[customerProgramId]` - Card display with QR (`app/pages/card/[customerProgramId].vue`)
- `/register` - Business owner registration (`app/pages/register.vue`)
- `/login` - Business owner login (`app/pages/login.vue`)
- `/staff/login` - Staff login (`app/pages/staff/login.vue`)
- `/confirm` - OAuth callback (`app/pages/confirm.vue`)

**Authenticated Routes:**
- `/dashboard/[businessSlug]/*` - Owner/admin dashboard (requires owner/admin role)
  - Protected by middleware `app/middleware/auth.ts` + layout redirects
- `/cashier` - Staff transaction entry (requires cashier role)
  - Protected by middleware auth + role check

**API Entry Points:**
- Base: `server/api/` using Nitro convention routing (filename = route)
- Pattern: `server/api/[resource]/[id].[method].ts` → `GET|POST|PUT|DELETE /api/[resource]/[id]`
- Examples:
  - `businesses/index.get.ts` → `GET /api/businesses`
  - `programs/index.post.ts` → `POST /api/programs`
  - `transactions/stamp.post.ts` → `POST /api/transactions/stamp`
  - `members/[id].delete.ts` → `DELETE /api/members/[id]`

## Error Handling

**Strategy:** Zod validation + Nuxt `createError()` with structured responses

**Patterns:**

1. **Validation Errors** (400):
   ```typescript
   // In API:
   const parsed = someSchema.safeParse(body)
   if (!parsed.success) {
     throw createError({
       statusCode: 400,
       message: 'Invalid input',
       data: parsed.error.flatten() // Structure: {fieldErrors, formErrors}
     })
   }

   // In UI:
   catch (e) {
     const fieldErrors = e.data?.data?.fieldErrors // Access nested validation
     toast.add({ title: e.data?.message })
   }
   ```

2. **Authorization Errors** (403):
   ```typescript
   // requireMember throws 403 if no membership or insufficient role
   await requireMember(event, businessId, { roles: ['owner', 'admin'] })
   ```

3. **Not Found Errors** (404):
   ```typescript
   if (!program) {
     throw createError({ statusCode: 404, message: 'Program not found' })
   }
   ```

4. **Conflict Errors** (409):
   ```typescript
   if (existingEnrollment) {
     throw createError({
       statusCode: 409,
       message: 'Customer already enrolled in this program'
     })
   }
   ```

5. **Transaction Rollback on Partial Failure**:
   ```typescript
   try {
     const program = await db.from('programs').insert(base).single()
     const config = await db.from('program_stamp_config').insert(stampConfig)
   } catch (e) {
     await db.from('programs').delete().eq('id', program.id) // CASCADE cleans config
     throw createError({ statusCode: 500, message: e.message })
   }
   ```

## Cross-Cutting Concerns

**Logging:** Not systematically implemented. Frontend uses `console.*`, API uses error bubbling.

**Validation:** Zod schemas define contract at API boundary. Frontend has duplicate validation (UForm schema) for UX.

**Authentication:** Supabase Auth (JWT) + requireUser()/requireMember() middleware pattern.

**Authorization:** RBAC with three roles (owner, admin, cashier) scoped to business or branch.

**Scope Resolution:**
- Business-level scoping: Programs, customers, transactions belong to business
- Branch-level scoping: Staff, programs can be scoped to specific branch
- Query filtering: APIs filter by `business_id` from auth context or query param

---

*Architecture analysis: 2026-03-20*
