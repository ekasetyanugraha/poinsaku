export default defineEventHandler(async (event) => {
  const businessId = getBusinessIdFromQuery(event)

  await requireMember(event, businessId)

  const db = getServiceClient(event)
  const query = getQuery(event)

  const search = query.search as string | undefined
  const page = parseInt(query.page as string) || 1
  const limit = parseInt(query.limit as string) || 20
  const offset = (page - 1) * limit

  // Base query: customers joined through customer_business_enrollments
  let q = db
    .from('customers')
    .select(
      `
      id,
      phone,
      name,
      email,
      gender,
      auth_user_id,
      created_at,
      updated_at,
      customer_business_enrollments!inner ( business_id, enrolled_at )
    `,
      { count: 'exact' },
    )
    .eq('customer_business_enrollments.business_id', businessId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error, count } = await q

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { data: data ?? [], total: count ?? 0, page, limit }
})
