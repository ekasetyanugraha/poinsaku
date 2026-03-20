export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = getServiceClient(event)

  // Use get_member_access RPC to resolve all businesses the user belongs to
  const { data: accessRows, error: accessError } = await db
    .rpc('get_member_access', { uid: user.id })

  if (accessError) {
    throw createError({ statusCode: 500, message: accessError.message })
  }

  if (!accessRows || accessRows.length === 0) {
    return []
  }

  // Collect unique business IDs and their roles
  const businessRoleMap = new Map<string, string>()
  for (const row of accessRows) {
    if (row.business_id && !businessRoleMap.has(row.business_id)) {
      businessRoleMap.set(row.business_id, row.role)
    }
  }

  const businessIds = [...businessRoleMap.keys()]

  const { data: businesses, error: bizError } = await db
    .from('businesses')
    .select('*')
    .in('id', businessIds)
    .order('created_at', { ascending: true })

  if (bizError) {
    throw createError({ statusCode: 500, message: bizError.message })
  }

  return (businesses || []).map((b) => ({
    ...b,
    role: businessRoleMap.get(b.id),
  }))
})
