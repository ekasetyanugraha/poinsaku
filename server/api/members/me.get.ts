export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const businessId = getBusinessIdFromQuery(event)
  const db = getServiceClient(event)

  // Get branch IDs for this business to resolve branch-scoped members
  const { data: branches } = await db
    .from('branches')
    .select('id')
    .eq('business_id', businessId)

  const branchIds = (branches || []).map((b) => b.id)

  // Find member record for this user in this business
  let query = db
    .from('members')
    .select('*')
    .eq('auth_user_id', user.id)

  if (branchIds.length > 0) {
    query = query.or(
      `and(scope_type.eq.business,scope_id.eq.${businessId}),` +
      `and(scope_type.eq.branch,scope_id.in.(${branchIds.join(',')}))`,
    )
  } else {
    query = query.eq('scope_type', 'business').eq('scope_id', businessId)
  }

  const { data, error } = await query.limit(1).maybeSingle()

  if (error || !data) {
    throw createError({ statusCode: 403, message: 'Not a member of this business' })
  }

  return data
})
