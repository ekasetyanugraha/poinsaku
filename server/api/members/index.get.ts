export default defineEventHandler(async (event) => {
  const businessId = getBusinessIdFromQuery(event)
  await requireMember(event, businessId)

  const db = getServiceClient(event)

  // Fetch branch IDs for this business to resolve branch-scoped members
  const { data: branches, error: branchError } = await db
    .from('branches')
    .select('id')
    .eq('business_id', businessId)

  if (branchError) {
    throw createError({ statusCode: 500, message: branchError.message })
  }

  const branchIds = (branches || []).map((b) => b.id)

  let query = db
    .from('members')
    .select('*')
    .order('created_at', { ascending: true })

  if (branchIds.length > 0) {
    query = query.or(
      `and(scope_type.eq.business,scope_id.eq.${businessId}),` +
      `and(scope_type.eq.branch,scope_id.in.(${branchIds.join(',')}))`,
    )
  } else {
    query = query.eq('scope_type', 'business').eq('scope_id', businessId)
  }

  const { data: members, error } = await query

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return members ?? []
})
