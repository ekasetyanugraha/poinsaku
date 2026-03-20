import { updateStatusSchema } from '#server/utils/validators'
import { getServiceClient, banAuthUser, unbanAuthUser } from '#server/utils/supabase'
import { requireOwner } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  // 1. Get member ID from route param
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Staff member ID is required' })
  }

  // 2. Parse and validate body
  const body = await readBody(event)
  const parsed = updateStatusSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const db = getServiceClient(event)

  // 3. Fetch target member
  const { data: targetMember } = await db
    .from('members')
    .select('id, auth_user_id, role, scope_type, scope_id, is_active, branches!left(business_id)')
    .eq('id', id)
    .maybeSingle()

  if (!targetMember) {
    throw createError({ statusCode: 404, message: 'Staff member not found' })
  }

  // 4. Resolve businessId
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

  // 7. Execute deactivation or reactivation
  const { action } = parsed.data

  if (action === 'deactivate') {
    // Ban auth user first (immediate session invalidation)
    await banAuthUser(event, targetMember.auth_user_id as string)

    // Update DB is_active flag
    const { error: dbError } = await db
      .from('members')
      .update({ is_active: false })
      .eq('id', id)

    if (dbError) {
      // Auth ban succeeded but DB write failed — inconsistent state
      // Auth ban is the stronger protection; requireMember() also checks is_active
      return { success: true, warning: 'Auth ban applied; DB status update failed. Retry recommended.' }
    }
  } else {
    // action === 'reactivate'
    // Unban auth user
    await unbanAuthUser(event, targetMember.auth_user_id as string)

    // Update DB is_active flag
    const { error: dbError } = await db
      .from('members')
      .update({ is_active: true })
      .eq('id', id)

    if (dbError) {
      // Auth unban succeeded but DB write failed
      return { success: true, warning: 'Auth unban applied; DB status update failed. Retry recommended.' }
    }
  }

  return { success: true }
})
