export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Member ID is required' })
  }

  const body = await readBody(event)
  const parsed = memberSchema.partial().safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const db = getServiceClient(event)

  // Fetch the member being updated to determine business context
  const { data: memberToUpdate, error: fetchError } = await db
    .from('members')
    .select('*, branches!left ( business_id )')
    .eq('id', id)
    .maybeSingle()

  if (fetchError || !memberToUpdate) {
    throw createError({ statusCode: 404, message: 'Member not found' })
  }

  // Resolve the business_id for this member
  let resolvedBusinessId: string
  if (memberToUpdate.scope_type === 'business') {
    resolvedBusinessId = memberToUpdate.scope_id as string
  } else {
    const branchBizId = (memberToUpdate.branches as { business_id: string } | null)?.business_id
    if (!branchBizId) {
      throw createError({ statusCode: 500, message: 'Could not resolve business for this member' })
    }
    resolvedBusinessId = branchBizId
  }

  // Require owner or business-scoped admin for that business
  const currentMember = await requireMember(event, resolvedBusinessId, { roles: ['owner', 'admin'] })
  if (currentMember.scopeType !== 'business') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  // Admins cannot modify owner-role members
  if (memberToUpdate.role === 'owner' && currentMember.role !== 'owner') {
    throw createError({ statusCode: 403, message: 'Only owners can modify other owners' })
  }

  // Admins cannot promote someone to owner
  if (parsed.data.role === 'owner' && currentMember.role !== 'owner') {
    throw createError({ statusCode: 403, message: 'Only owners can assign the owner role' })
  }

  const { data: updated, error } = await db
    .from('members')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return updated
})
