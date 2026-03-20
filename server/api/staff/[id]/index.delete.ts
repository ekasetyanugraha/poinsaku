export default defineEventHandler(async (event) => {
  // 1. Get member ID from route param
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Staff member ID is required' })
  }

  const db = getServiceClient(event)

  // 2. Fetch target member to resolve business context
  const { data: targetMember } = await db
    .from('members')
    .select('id, auth_user_id, role, scope_type, scope_id, branches!left(business_id)')
    .eq('id', id)
    .maybeSingle()

  if (!targetMember) {
    throw createError({ statusCode: 404, message: 'Staff member not found' })
  }

  // 3. Resolve businessId
  const businessId = targetMember.scope_type === 'business'
    ? (targetMember.scope_id as string)
    : ((targetMember.branches as { business_id: string } | null)?.business_id)
  if (!businessId) {
    throw createError({ statusCode: 500, message: 'Cannot resolve business for this member' })
  }

  // 4. Assert owner
  await requireOwner(event, businessId)

  // 5. Guard: reject owner-role targets
  if (targetMember.role === 'owner') {
    throw createError({ statusCode: 403, message: 'Cannot delete owner accounts through staff endpoints' })
  }

  // 6. Delete member row first
  const { error: deleteError } = await db
    .from('members')
    .delete()
    .eq('id', id)

  if (deleteError) {
    throw createError({ statusCode: 500, message: 'Gagal menghapus data staf.' })
  }

  // 7. Delete auth user (best-effort — member row already gone = no business access)
  try {
    await deleteAuthUser(event, targetMember.auth_user_id as string)
  }
  catch {
    // Member row already deleted — orphan auth user has no business access
    // Return success with warning per CONTEXT.md decision
    return { deleted: true, warning: 'Member removed but auth user deletion failed. Orphan auth user has no business access.' }
  }

  return { deleted: true }
})
