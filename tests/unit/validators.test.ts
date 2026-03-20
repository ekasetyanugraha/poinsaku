import { describe, it, expect } from 'vitest'
import {
  createStaffSchema,
  resetPasswordSchema,
  updateStatusSchema,
  reassignBranchSchema,
} from '../../server/utils/validators'

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

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

  it('rejects missing password', () => {
    const result = createStaffSchema.safeParse({
      email: 'a@b.com',
      role: 'admin',
      scope_type: 'business',
      scope_id: VALID_UUID,
    })
    expect(result.success).toBe(false)
  })

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

  it('rejects password with no uppercase or number', () => {
    const result = createStaffSchema.safeParse({
      email: 'a@b.com',
      password: 'abcdefgh',
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

  it('accepts role admin', () => {
    const result = createStaffSchema.safeParse({
      email: 'a@b.com',
      password: 'Abc12345',
      role: 'admin',
      scope_type: 'business',
      scope_id: VALID_UUID,
    })
    expect(result.success).toBe(true)
  })

  it('accepts role cashier', () => {
    const result = createStaffSchema.safeParse({
      email: 'a@b.com',
      password: 'Abc12345',
      role: 'cashier',
      scope_type: 'business',
      scope_id: VALID_UUID,
    })
    expect(result.success).toBe(true)
  })

  it('accepts omitted display_name', () => {
    const result = createStaffSchema.safeParse({
      email: 'a@b.com',
      password: 'Abc12345',
      role: 'admin',
      scope_type: 'business',
      scope_id: VALID_UUID,
    })
    expect(result.success).toBe(true)
  })

  it('accepts display_name when provided', () => {
    const result = createStaffSchema.safeParse({
      email: 'a@b.com',
      password: 'Abc12345',
      display_name: 'John Doe',
      role: 'admin',
      scope_type: 'business',
      scope_id: VALID_UUID,
    })
    expect(result.success).toBe(true)
  })

  it('rejects scope_id that is not a UUID', () => {
    const result = createStaffSchema.safeParse({
      email: 'a@b.com',
      password: 'Abc12345',
      role: 'admin',
      scope_type: 'business',
      scope_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })
})

describe('resetPasswordSchema', () => {
  it('accepts valid password', () => {
    const result = resetPasswordSchema.safeParse({ password: 'Abc12345' })
    expect(result.success).toBe(true)
  })

  it('rejects password shorter than 8 chars', () => {
    const result = resetPasswordSchema.safeParse({ password: 'short' })
    expect(result.success).toBe(false)
  })

  it('rejects password with no uppercase or number', () => {
    const result = resetPasswordSchema.safeParse({ password: 'abcdefgh' })
    expect(result.success).toBe(false)
  })
})

describe('updateStatusSchema', () => {
  it('accepts action deactivate', () => {
    const result = updateStatusSchema.safeParse({ action: 'deactivate' })
    expect(result.success).toBe(true)
  })

  it('accepts action reactivate', () => {
    const result = updateStatusSchema.safeParse({ action: 'reactivate' })
    expect(result.success).toBe(true)
  })

  it('rejects unknown action suspend', () => {
    const result = updateStatusSchema.safeParse({ action: 'suspend' })
    expect(result.success).toBe(false)
  })
})

describe('reassignBranchSchema', () => {
  it('accepts branch scope with valid UUID', () => {
    const result = reassignBranchSchema.safeParse({
      scope_type: 'branch',
      scope_id: VALID_UUID,
    })
    expect(result.success).toBe(true)
  })

  it('accepts business scope with valid UUID', () => {
    const result = reassignBranchSchema.safeParse({
      scope_type: 'business',
      scope_id: VALID_UUID,
    })
    expect(result.success).toBe(true)
  })

  it('rejects unknown scope_type region', () => {
    const result = reassignBranchSchema.safeParse({
      scope_type: 'region',
      scope_id: VALID_UUID,
    })
    expect(result.success).toBe(false)
  })

  it('rejects scope_id that is not a UUID', () => {
    const result = reassignBranchSchema.safeParse({
      scope_type: 'branch',
      scope_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })
})
