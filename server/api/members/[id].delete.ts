export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Member ID is required' })
  }

  const db = getServiceClient(event)

  // Fetch the member being deleted to determine business context
  const { data: memberToDelete, error: fetchError } = await db
    .from('members')
    .select('*, branches!left ( business_id )')
    .eq('id', id)
    .maybeSingle()

  if (fetchError || !memberToDelete) {
    throw createError({ statusCode: 404, message: 'Member not found' })
  }

  // Resolve the business_id for this member
  let resolvedBusinessId: string
  if (memberToDelete.scope_type === 'business') {
    resolvedBusinessId = memberToDelete.scope_id as string
  } else {
    const branchBizId = (memberToDelete.branches as { business_id: string } | null)?.business_id
    if (!branchBizId) {
      throw createError({ statusCode: 500, message: 'Could not resolve business for this member' })
    }
    resolvedBusinessId = branchBizId
  }

  // Require owner for that business
  const currentUser = await requireOwner(event, resolvedBusinessId)

  // Cannot remove yourself if you're the last owner of the business
  if (memberToDelete.auth_user_id === currentUser.authUserId) {
    const { count } = await db
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'owner')
      .eq('scope_type', 'business')
      .eq('scope_id', resolvedBusinessId)

    if ((count ?? 0) <= 1) {
      throw createError({ statusCode: 400, message: 'Cannot remove the last owner' })
    }
  }

  const { error } = await db
    .from('members')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { deleted: true }
})
