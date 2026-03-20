export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const programId = body?.program_id as string
  if (!programId) {
    throw createError({ statusCode: 400, message: 'program_id is required' })
  }

  const parsed = voucherOptionSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const db = getServiceClient(event)

  // Fetch program to get business_id and validate type
  const { data: program, error: programError } = await db
    .from('programs')
    .select('id, business_id, type')
    .eq('id', programId)
    .single()

  if (programError || !program) {
    throw createError({ statusCode: 404, message: 'Program not found' })
  }

  if (program.type !== 'membership') {
    throw createError({ statusCode: 400, message: 'Program is not a membership program' })
  }

  // Require owner or admin
  await requireMember(event, program.business_id, { roles: ['owner', 'admin'] })

  // Verify the program has cashback_redemption_mode = 'voucher'
  const { data: config, error: configError } = await db
    .from('program_membership_config')
    .select('cashback_redemption_mode')
    .eq('program_id', programId)
    .single()

  if (configError || !config) {
    throw createError({ statusCode: 400, message: 'Membership config not found for this program' })
  }

  if (config.cashback_redemption_mode !== 'voucher') {
    throw createError({ statusCode: 400, message: 'Program does not use voucher redemption mode' })
  }

  const { data: option, error } = await db
    .from('membership_voucher_options')
    .insert({ ...parsed.data, program_id: programId })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return option
})
