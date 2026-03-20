export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Business ID is required' })
  }

  const member = await requireMember(event, id)
  const db = getServiceClient(event)

  // Fetch business
  const { data: business, error: bizError } = await db
    .from('businesses')
    .select('*')
    .eq('id', id)
    .single()

  if (bizError || !business) {
    throw createError({ statusCode: 404, message: 'Business not found' })
  }

  // Count branches
  const { count: branchCount } = await db
    .from('branches')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', id)

  // Count programs
  const { count: programCount } = await db
    .from('programs')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', id)

  // Count business-scoped members
  const { count: bizMemberCount } = await db
    .from('members')
    .select('id', { count: 'exact', head: true })
    .eq('scope_type', 'business')
    .eq('scope_id', id)

  // Count branch-scoped members (via branch IDs belonging to this business)
  const { data: branchRows } = await db
    .from('branches')
    .select('id')
    .eq('business_id', id)

  let branchMemberCount = 0
  if (branchRows && branchRows.length > 0) {
    const { count } = await db
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('scope_type', 'branch')
      .in('scope_id', branchRows.map((b) => b.id))
    branchMemberCount = count ?? 0
  }

  return {
    ...business,
    role: member.role,
    branch_count: branchCount ?? 0,
    program_count: programCount ?? 0,
    member_count: (bizMemberCount ?? 0) + branchMemberCount,
  }
})
