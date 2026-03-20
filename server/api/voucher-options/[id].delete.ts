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

  // Require owner only
  await requireOwner(event, program.business_id)

  // Soft-delete: already-issued vouchers remain redeemable
  const { error } = await db
    .from('membership_voucher_options')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return { deactivated: true }
})
