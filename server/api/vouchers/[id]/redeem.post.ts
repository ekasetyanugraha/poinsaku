export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'Voucher ID is required' })
  }

  const db = getServiceClient(event)

  // Fetch voucher by ID
  const { data: voucher, error: fetchError } = await db
    .from('vouchers')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !voucher) {
    throw createError({ statusCode: 404, message: 'Voucher not found' })
  }

  // Require membership access for this business
  await requireMember(event, voucher.business_id)

  // Verify voucher is active
  if (voucher.status !== 'active') {
    throw createError({ statusCode: 400, message: 'Voucher is not active' })
  }

  // Verify voucher is not expired
  if (new Date(voucher.expires_at) <= new Date()) {
    throw createError({ statusCode: 400, message: 'Voucher has expired' })
  }

  // Update voucher status to redeemed
  const { data: updatedVoucher, error: updateError } = await db
    .from('vouchers')
    .update({
      status: 'redeemed',
      redeemed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  return updatedVoucher
})
