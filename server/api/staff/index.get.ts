export default defineEventHandler(async (event) => {
  const businessId = getBusinessIdFromQuery(event)
  await requireOwner(event, businessId)

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

  // Build member query with OR filter for business-scoped and branch-scoped members
  let query = db
    .from('members')
    .select('id, auth_user_id, role, scope_type, scope_id, is_active, display_name, invited_by, created_at')
    .order('created_at', { ascending: true })

  if (branchIds.length > 0) {
    query = query.or(
      `and(scope_type.eq.business,scope_id.eq.${businessId}),` +
      `and(scope_type.eq.branch,scope_id.in.(${branchIds.join(',')}))`,
    )
  } else {
    query = query.eq('scope_type', 'business').eq('scope_id', businessId)
  }

  const { data: members, error: membersError } = await query

  if (membersError) {
    throw createError({ statusCode: 500, message: membersError.message })
  }

  // Fetch all auth users via service client admin API
  const { data: authData, error: authError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })

  if (authError) {
    throw createError({ statusCode: 500, message: authError.message })
  }

  // Build a Map keyed by user ID for O(1) lookups
  const authUserMap = new Map(authData.users.map((u) => [u.id, u]))

  // Merge members with auth user data
  const enrichedMembers = (members ?? []).map((member) => {
    const authUser = authUserMap.get(member.auth_user_id as string)
    return {
      ...member,
      email: authUser?.email ?? null,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
    }
  })

  return { data: enrichedMembers }
})
