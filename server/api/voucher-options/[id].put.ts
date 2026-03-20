export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Voucher option ID is required' })
  }

  const db = getServiceClient(event)

  // Fetch option to resolve program_id → business_id
  const { data: existing, error: fetchError } = await db
    .from('membership_voucher_options')
    .select('id, program_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    throw createError({ statusCode: 404, message: 'Voucher option not found' })
  }

  // Resolve business_id via programs table
  const { data: program } = await db
    .from('programs')
    .select('business_id')
    .eq('id', existing.program_id)
    .single()

  if (!program?.business_id) {
    throw createError({ statusCode: 500, message: 'Could not resolve business for this voucher option' })
  }

  // Require owner or admin
  await requireMember(event, program.business_id, { roles: ['owner', 'admin'] })

  const body = await readBody(event)
  const parsed = voucherOptionSchema.partial().safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const { data: option, error } = await db
    .from('membership_voucher_options')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return option
})
