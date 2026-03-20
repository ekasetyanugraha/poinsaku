import { reassignBranchSchema } from '~/server/utils/validators'
import { getServiceClient } from '~/server/utils/supabase'
import { requireOwner } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  // 1. Get member ID from route param
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Staff member ID is required' })
  }

  // 2. Parse and validate body
  const body = await readBody(event)
  const parsed = reassignBranchSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const db = getServiceClient(event)

  // 3. Fetch target member
  const { data: targetMember } = await db
    .from('members')
    .select('id, auth_user_id, role, scope_type, scope_id, branches!left(business_id)')
    .eq('id', id)
    .maybeSingle()

  if (!targetMember) {
    throw createError({ statusCode: 404, message: 'Staff member not found' })
  }

  // 4. Resolve businessId (from current scope — before reassignment)
  const businessId = targetMember.scope_type === 'business'
    ? (targetMember.scope_id as string)
    : ((targetMember.branches as { business_id: string } | null)?.business_id)
  if (!businessId) {
    throw createError({ statusCode: 500, message: 'Cannot resolve business for this member' })
  }

  // 5. Assert owner
  await requireOwner(event, businessId)

  // 6. Guard: reject owner-role targets
  if (targetMember.role === 'owner') {
    throw createError({ statusCode: 403, message: 'Cannot modify owner accounts through staff endpoints' })
  }

  // 7. Validate the new scope target exists and belongs to the same business
  const { scope_type: newScopeType, scope_id: newScopeId } = parsed.data

  if (newScopeType === 'branch') {
    const { data: branch } = await db
      .from('branches')
      .select('id, business_id')
      .eq('id', newScopeId)
      .maybeSingle()

    if (!branch) {
      throw createError({ statusCode: 404, message: 'Target branch not found' })
    }

    // Ensure branch belongs to the same business
    if (branch.business_id !== businessId) {
      throw createError({ statusCode: 400, message: 'Target branch does not belong to this business' })
    }
  } else {
    // scope_type === 'business' — verify it's the same business
    if (newScopeId !== businessId) {
      throw createError({ statusCode: 400, message: 'Cannot reassign to a different business' })
    }
  }

  // 8. Update scope on members row
  const { data: updated, error: updateError } = await db
    .from('members')
    .update({ scope_type: newScopeType, scope_id: newScopeId })
    .eq('id', id)
    .select('id, scope_type, scope_id')
    .single()

  if (updateError) {
    throw createError({ statusCode: 500, message: 'Gagal memperbarui cabang staf.' })
  }

  return { success: true, scope_type: updated.scope_type, scope_id: updated.scope_id }
})
