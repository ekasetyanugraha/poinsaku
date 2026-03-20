# Coding Conventions

**Analysis Date:** 2026-03-20

## Naming Patterns

**Files:**
- API route handlers: kebab-case with HTTP method suffix (e.g., `index.post.ts`, `[id].put.ts`, `[id].delete.ts`)
- Utility files: camelCase (e.g., `validators.ts`, `auth.ts`, `supabase.ts`)
- Composables: `use` prefix with camelCase (e.g., `useAuth.ts`, `useBusiness.ts`, `useProgram.ts`)
- Middleware: camelCase (e.g., `auth.ts`, `role.ts`)

**Functions:**
- Async utilities: camelCase with `Async` suffix or implicit async (e.g., `requireUser()`, `requireMember()`, `createAuthUser()`)
- Helper functions: descriptive camelCase (e.g., `normalizePhone()`, `getBusinessIdFromQuery()`)
- Handlers: default export as `defineEventHandler()` wrapping handler logic

**Variables:**
- Local variables: camelCase (e.g., `calculatedStamps`, `businessId`, `currentMember`)
- Database fields: snake_case (e.g., `auth_user_id`, `scope_type`, `business_id`)
- Computed properties in composables: camelCase (e.g., `activeBusiness`, `activeBusinessId`, `isAuthenticated`)

**Types:**
- Interfaces: PascalCase with descriptive names (e.g., `MemberAccess`)
- Schema exports: PascalCase with `Schema` suffix (e.g., `businessSchema`, `memberSchema`, `createStaffSchema`)
- Enums: PascalCase for type names, UPPERCASE for enum values when appropriate

## Code Style

**Formatting:**
- No linter or formatter configuration detected. Codebase uses consistent patterns but relies on developer discipline
- Indentation: 2 spaces (observed across all TypeScript files)
- Line length: No strict limit enforced, but generally concise

**Linting:**
- No ESLint or Biome configuration found
- Code relies on TypeScript compiler and manual review for quality

## Import Organization

**Order:**
1. External dependencies (e.g., `import { z } from 'zod'`, `import jwt from 'jsonwebtoken'`)
2. Nuxt/framework imports (e.g., `import { serverSupabaseClient } from '#supabase/server'`)
3. Type imports from framework (e.g., `import type { H3Event } from 'h3'`)
4. Local utility/helper imports (e.g., `import { getServiceClient } from './supabase'`)

**Path Aliases:**
- `#server/*` - Server-side utilities and internals (e.g., `import { updateStatusSchema } from '#server/utils/validators'`)
- `#supabase/server` - Nuxt Supabase module server composables
- Relative imports: Used for local module imports (e.g., `import { getServiceClient } from './supabase'`)

## Error Handling

**Patterns:**
- H3 error handler pattern: `throw createError({ statusCode: XXX, message: 'Error message', data?: ... })`
- Status codes used:
  - `400` - Invalid input (validation failures)
  - `401` - Unauthorized (missing/invalid auth)
  - `403` - Forbidden (insufficient permissions)
  - `404` - Not found (resource doesn't exist)
  - `409` - Conflict (duplicate/constraint violation)
  - `500` - Server error (unexpected failures)
- Data field for validation errors: `parsed.error.flatten()` from Zod schema validation
- Validation: Schema validation done upfront with `schema.safeParse(body)`, then throw error if not successful
- Database errors: Error object checked after each Supabase query, thrown as 500 with message

**Example from `server/api/members/index.post.ts`:**
```typescript
const parsed = memberSchema.safeParse(body)
if (!parsed.success) {
  throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
}
```

## Logging

**Framework:** `console` only (no logging library detected)

**Patterns:**
- Not extensively used in the codebase
- Error messages are included in HTTP responses rather than logged to stdout
- Database operation errors include error messages in HTTP error responses

## Comments

**When to Comment:**
- Function purpose documented with JSDoc/comment blocks before function definition
- Complex logic flows explained inline (e.g., numbered steps in multi-step operations)
- Non-obvious business rules clarified (e.g., membership scope resolution logic in `requireMember()`)
- Environment-specific notes (e.g., certificate requirements in wallet generation)

**JSDoc/TSDoc:**
- Used for exported utility functions with parameters and return types documented in comments
- Example from `server/utils/auth.ts`:
```typescript
/**
 * Get the authenticated user from the request.
 * Uses serverSupabaseClient + auth.getUser() instead of serverSupabaseUser,
 * because serverSupabaseUser in @nuxtjs/supabase v2 returns JWT claims (sub)
 * instead of a User object (id).
 */
export async function requireUser(event: H3Event) { ... }
```

## Function Design

**Size:**
- API handlers typically 50-120 lines with clear step-by-step flow
- Utility functions generally 10-40 lines for single responsibility
- No explicit small-function requirement, but complexity drives function extraction

**Parameters:**
- Database operation functions: `event: H3Event` as first parameter for Nuxt context
- Data payload: `data: Record<string, unknown>` for flexible object types, or specific typed interfaces
- Optional configurations passed as options objects with `opts?: { key?: value }` pattern

**Return Values:**
- Database operations: Return result object directly from Supabase
- Composables: Return object with reactive properties and methods
- Handlers: Return data object for successful responses
- Async operations: Always return Promise (implicit or explicit)

## Module Design

**Exports:**
- API handlers: Default export as `defineEventHandler()` function
- Utilities: Named exports for functions and interfaces (e.g., `export function requireUser()`, `export interface MemberAccess`)
- Schemas: Named exports for each validation schema (e.g., `export const businessSchema = ...`)
- Composables: Default export of function

**Barrel Files:**
- Not used in this codebase - direct imports from specific files are preferred

## API Handler Pattern

Standard request flow in all API handlers:
1. Read request body with `readBody(event)`
2. Validate with schema using `schema.safeParse(body)`
3. Get database client with `getServiceClient(event)`
4. Perform authorization/membership checks
5. Query database with explicit select/filtering
6. Handle errors with `createError()`
7. Return response object

**Example structure from `server/api/transactions/stamp.post.ts`:**
```typescript
export default defineEventHandler(async (event) => {
  // 1. Validate input
  const body = await readBody(event)
  const parsed = stampAddSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  // 2. Get database client
  const db = getServiceClient(event)

  // 3. Fetch and verify resources exist
  const { data: customerProgram, error: cpError } = await db
    .from('customer_programs')
    .select('...')
    .eq('id', parsed.data.customer_program_id)
    .single()

  // 4. Verify membership/permissions
  const member = await requireMember(event, businessId)

  // 5. Perform business logic
  let calculatedStamps: number
  if (parsed.data.stamps_count !== undefined) {
    calculatedStamps = parsed.data.stamps_count
  } else { ... }

  // 6. Update database
  const { data: updatedProgress, error: updateError } = await db
    .from('customer_stamp_progress')
    .update({ ... })
    .select()
    .single()

  // 7. Return response
  return { transaction, stamp_progress: updatedProgress }
})
```

---

*Convention analysis: 2026-03-20*
