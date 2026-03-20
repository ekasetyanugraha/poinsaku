import { resetPasswordSchema } from '#server/utils/validators'
import { getServiceClient, updateAuthUserPassword } from '#server/utils/supabase'
import { requireOwner } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  // 1. Get member ID from route param
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Staff member ID is required' })
  }

  // 2. Parse and validate body
  const body = await readBody(event)
  const parsed = resetPasswordSchema.safeParse(body)
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

  // 7. Update password via auth admin API
  await updateAuthUserPassword(event, targetMember.auth_user_id as string, parsed.data.password)

  return { success: true }
})
