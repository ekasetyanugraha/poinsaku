export default defineEventHandler(async (event) => {
  const businessId = getBusinessIdFromQuery(event)

  const member = await requireMember(event, businessId)

  const db = getServiceClient(event)
  const query = getQuery(event)

  // Build base query with stamp config joined for stamp programs
  let q = db
    .from('programs')
    .select(`
      id,
      business_id,
      type,
      name,
      description,
      is_active,
      scope_type,
      scope_id,
      color_primary,
      color_secondary,
      created_at,
      updated_at,
      program_stamp_config ( stamp_target, stamp_mode )
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  // Active filter: owners see all when include_inactive=true, otherwise only active
  const includeInactive = query.include_inactive === 'true'
  if (!includeInactive || (member.role !== 'owner' && member.role !== 'admin')) {
    q = q.eq('is_active', true)
  }

  // Optional filters
  if (query.type) {
    q = q.eq('type', query.type as string)
  }
  if (query.scope_type) {
    q = q.eq('scope_type', query.scope_type as string)
  }
  if (query.branch_id) {
    q = q.eq('scope_id', query.branch_id as string)
  }

  const { data, error } = await q

  if (error) throw createError({ statusCode: 500, message: error.message })

  // For membership programs, attach tier count
  const programIds = (data ?? [])
    .filter(p => p.type === 'membership')
    .map(p => p.id)

  let tierCounts: Record<string, number> = {}
  if (programIds.length > 0) {
    const { data: tiers } = await db
      .from('membership_tiers')
      .select('program_id')
      .in('program_id', programIds)

    if (tiers) {
      tierCounts = tiers.reduce((acc: Record<string, number>, t) => {
        acc[t.program_id] = (acc[t.program_id] ?? 0) + 1
        return acc
      }, {})
    }
  }

  return (data ?? []).map(p => ({
    ...p,
    tier_count: p.type === 'membership' ? (tierCounts[p.id] ?? 0) : undefined,
  }))
})
