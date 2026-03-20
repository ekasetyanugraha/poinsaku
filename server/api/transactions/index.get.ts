export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const businessId = query.business_id as string | undefined

  if (!businessId) {
    throw createError({ statusCode: 400, message: 'business_id is required' })
  }

  const member = await requireMember(event, businessId)

  const db = getServiceClient(event)

  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  const offset = (page - 1) * limit

  // For branch-scoped members, force branch_id to their branch
  let branchId = query.branch_id as string | undefined
  if (member.scopeType === 'branch') {
    branchId = member.branchId ?? undefined
  }

  const programId = query.program_id as string | undefined
  const type = query.type as string | undefined

  let q = db
    .from('transactions')
    .select('*, customer_programs!inner(customer_id, customers!inner(name, phone))', { count: 'exact' })
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (branchId) {
    q = q.eq('branch_id', branchId)
  }

  if (programId) {
    q = q.eq('customer_programs.program_id', programId)
  }

  if (type) {
    q = q.eq('type', type)
  }

  const { data, error, count } = await q

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { data: data ?? [], total: count ?? 0, page, limit }
})
