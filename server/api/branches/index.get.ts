export default defineEventHandler(async (event) => {
  const businessId = getBusinessIdFromQuery(event)
  const member = await requireMember(event, businessId)

  const query = getQuery(event)
  const includeInactive = query.include_inactive === 'true'

  const db = getServiceClient(event)

  let qb = db
    .from('branches')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: true })

  // Only owners can see inactive branches
  if (includeInactive && member.role === 'owner') {
    // Return all branches (no is_active filter)
  } else {
    qb = qb.eq('is_active', true)
  }

  const { data: branches, error } = await qb

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return branches ?? []
})
