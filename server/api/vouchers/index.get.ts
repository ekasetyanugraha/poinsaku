export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const customerProgramId = query.customer_program_id as string

  if (!customerProgramId) {
    throw createError({ statusCode: 400, message: 'customer_program_id is required' })
  }

  const includeAll = query.include_all === 'true'

  const db = getServiceClient(event)

  let q = db
    .from('vouchers')
    .select('*, membership_voucher_options!inner(name, description, image_url)')
    .eq('customer_program_id', customerProgramId)
    .order('created_at', { ascending: false })

  if (!includeAll) {
    q = q.eq('status', 'active').gte('expires_at', new Date().toISOString())
  }

  const { data: vouchers, error } = await q

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return vouchers ?? []
})
