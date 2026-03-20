import { serverSupabaseClient } from '#supabase/server'
import type { H3Event } from 'h3'
import { getServiceClient } from './supabase'

/**
 * Get the authenticated user from the request.
 * Uses serverSupabaseClient + auth.getUser() instead of serverSupabaseUser,
 * because serverSupabaseUser in @nuxtjs/supabase v2 returns JWT claims (sub)
 * instead of a User object (id).
 */
export async function requireUser(event: H3Event) {
  const client = await serverSupabaseClient(event)
  const { data: { user }, error } = await client.auth.getUser()

  if (error || !user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  return user
}

export interface MemberAccess {
  id: string
  authUserId: string
  role: 'owner' | 'admin' | 'cashier'
  scopeType: 'business' | 'branch'
  scopeId: string
  businessId: string
  branchId: string | null
}

/**
 * Assert the authenticated user has an active membership in the given business.
 * Uses the service client to bypass RLS (chicken-and-egg: need membership to pass RLS).
 *
 * Supports two membership scopes:
 *   - business-scoped: scope_type = 'business', scope_id = businessId
 *   - branch-scoped:   scope_type = 'branch',   scope_id = branchId (joined through branches table)
 */
export async function requireMember(
  event: H3Event,
  businessId: string,
  opts?: { roles?: ('owner' | 'admin' | 'cashier')[] },
): Promise<MemberAccess> {
  const user = await requireUser(event)
  const db = getServiceClient(event)

  // First check for a direct business-scoped membership
  const { data: bizMember } = await db
    .from('members')
    .select('id, auth_user_id, role, scope_type, scope_id')
    .eq('auth_user_id', user.id)
    .eq('scope_type', 'business')
    .eq('scope_id', businessId)
    .maybeSingle()

  let member = bizMember

  // If no business-scoped membership, check branch-scoped memberships
  if (!member) {
    const { data: branches } = await db
      .from('branches')
      .select('id')
      .eq('business_id', businessId)

    if (branches && branches.length > 0) {
      const branchIds = branches.map(b => b.id)
      const { data: branchMember } = await db
        .from('members')
        .select('id, auth_user_id, role, scope_type, scope_id')
        .eq('auth_user_id', user.id)
        .eq('scope_type', 'branch')
        .in('scope_id', branchIds)
        .limit(1)
        .maybeSingle()

      member = branchMember
    }
  }

  if (!member) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  if (opts?.roles && !opts.roles.includes(member.role as MemberAccess['role'])) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  return {
    id: member.id as string,
    authUserId: member.auth_user_id as string,
    role: member.role as MemberAccess['role'],
    scopeType: member.scope_type as MemberAccess['scopeType'],
    scopeId: member.scope_id as string,
    businessId,
    branchId: member.scope_type === 'branch' ? (member.scope_id as string) : null,
  }
}

/**
 * Shorthand: assert the authenticated user is the owner of the given business.
 */
export async function requireOwner(event: H3Event, businessId: string) {
  return requireMember(event, businessId, { roles: ['owner'] })
}
