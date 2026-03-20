# Testing Patterns

**Analysis Date:** 2026-03-20

## Test Framework

**Runner:**
- Vitest 4.1.0
- Config: `vitest.config.ts`
- Environment: Node.js

**Assertion Library:**
- Vitest built-in (expect API)

**Run Commands:**
```bash
npm test                          # Run all tests
npm test -- --watch              # Watch mode (inferred from standard vitest usage)
npm test -- --coverage           # Coverage report (standard vitest flag)
```

**Configuration Details from `vitest.config.ts`:**
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
```

## Test File Organization

**Location:**
- Co-located in `tests/unit/` directory (not alongside source files)
- Directory structure mirrors test intent rather than source structure

**Naming:**
- Pattern: `*.test.ts`
- Examples: `validators.test.ts`, `staff-display.test.ts`

**Structure:**
```
tests/
└── unit/
    ├── validators.test.ts
    └── staff-display.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest'
import { createStaffSchema } from '../../server/utils/validators'

describe('createStaffSchema', () => {
  it('accepts valid input', () => {
    const result = createStaffSchema.safeParse({
      email: 'a@b.com',
      password: 'Abc12345',
      role: 'admin',
      scope_type: 'business',
      scope_id: VALID_UUID,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing email', () => {
    const result = createStaffSchema.safeParse({
      password: 'Abc12345',
      role: 'admin',
      scope_type: 'business',
      scope_id: VALID_UUID,
    })
    expect(result.success).toBe(false)
  })
})
```

**Patterns:**
- Setup: Constants defined at top of describe block (e.g., `const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'`)
- Teardown: None detected (tests are stateless)
- Assertion pattern: `expect(actual).toBe(expected)` for boolean checks, direct value comparisons

**Test Case Pattern:**
- Each `it()` block tests one specific behavior
- Descriptive test names beginning with verb: "accepts valid input", "rejects missing email"
- Positive and negative test cases paired for each validation rule

## Mocking

**Framework:** None detected

**What to Mock:** (Based on test patterns observed)
- Database queries: Currently not mocked, tested with schema validation instead
- HTTP requests: Not tested in current test suite
- Date/time: Mocked with `new Date(Date.now() - 60 * 60 * 1000)` for relative time tests

**What NOT to Mock:**
- Schema validators: Tested directly without mocking Zod
- Date formatting functions: Tested with actual date-fns library
- Validation rules: Tested exhaustively with real schema objects

## Fixtures and Factories

**Test Data:**
```typescript
// From validators.test.ts
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

// Reused across multiple describe blocks for consistent UUIDs
describe('createStaffSchema', () => {
  it('accepts valid input', () => {
    const result = createStaffSchema.safeParse({
      email: 'a@b.com',
      password: 'Abc12345',
      role: 'admin',
      scope_type: 'business',
      scope_id: VALID_UUID,
    })
    expect(result.success).toBe(true)
  })
})
```

**Location:**
- Constants defined at file scope or describe block scope
- No separate fixtures directory or factory functions detected
- Test data embedded inline in test cases

## Coverage

**Requirements:** No coverage enforcement detected

**View Coverage:**
```bash
npm test -- --coverage  # Standard vitest coverage command (inferred)
```

## Test Types

**Unit Tests:**
- Scope: Schema validation (Zod schemas)
- Approach: Test each schema with valid and invalid inputs, covering all validation rules
- Location: `tests/unit/validators.test.ts`, `tests/unit/staff-display.test.ts`

**Integration Tests:**
- Not implemented in current test suite

**E2E Tests:**
- Not used in project

## Testing Validators (Primary Pattern)

Validators are the main testing focus. Pattern from `tests/unit/validators.test.ts`:

1. **Import schema and test utilities:**
```typescript
import { describe, it, expect } from 'vitest'
import { createStaffSchema } from '../../server/utils/validators'
```

2. **Define test constants:**
```typescript
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'
```

3. **Test valid input:**
```typescript
it('accepts valid input', () => {
  const result = createStaffSchema.safeParse({
    email: 'a@b.com',
    password: 'Abc12345',
    role: 'admin',
    scope_type: 'business',
    scope_id: VALID_UUID,
  })
  expect(result.success).toBe(true)
})
```

4. **Test invalid cases (one per validation rule):**
```typescript
it('rejects password shorter than 8 chars', () => {
  const result = createStaffSchema.safeParse({
    email: 'a@b.com',
    password: 'short',
    role: 'admin',
    scope_type: 'business',
    scope_id: VALID_UUID,
  })
  expect(result.success).toBe(false)
})

it('rejects role owner', () => {
  const result = createStaffSchema.safeParse({
    email: 'a@b.com',
    password: 'Abc12345',
    role: 'owner',
    scope_type: 'business',
    scope_id: VALID_UUID,
  })
  expect(result.success).toBe(false)
})
```

## Testing Utility Functions (Secondary Pattern)

Utility functions tested directly with realistic inputs. Pattern from `tests/unit/staff-display.test.ts`:

```typescript
function relativeTime(isoString: string | null): string {
  if (!isoString) return 'Belum pernah login'
  return formatDistanceToNow(new Date(isoString), { addSuffix: true, locale: idLocale })
}

describe('relativeTime', () => {
  it('returns "Belum pernah login" for null input', () => {
    expect(relativeTime(null)).toBe('Belum pernah login')
  })

  it('returns Indonesian relative time for valid ISO string', () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const result = relativeTime(oneHourAgo)
    expect(result).toContain('lalu')
  })
})
```

## Common Patterns

**Async Testing:**
- No async tests in current test suite (validators are synchronous)
- Pattern would use: `it('should do something', async () => { ... })`

**Error Testing:**
Pattern for validations that should fail:
```typescript
it('rejects invalid value', () => {
  const result = schema.safeParse({ invalidData })
  expect(result.success).toBe(false)
})
```

## Test Coverage Gaps

**Not tested:**
- API handlers (`server/api/` directory)
- Composables (`app/composables/` directory)
- Middleware (`app/middleware/` directory)
- Database operations
- Authentication flows
- Business logic beyond schema validation

**Currently covered:**
- Schema validation (comprehensive: valid inputs, missing fields, invalid formats, enum constraints, regex patterns)
- Simple utility functions

---

*Testing analysis: 2026-03-20*
