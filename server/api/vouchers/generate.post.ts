import crypto from 'crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = voucherGenerateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const db = getServiceClient(event)

  // Abuse prevention: verify the QR token is valid and not expired for this customer_program_id
  const { data: qrToken } = await db
    .from('qr_tokens')
    .select('id, expires_at, is_used')
    .eq('customer_program_id', parsed.data.customer_program_id)
    .eq('token', parsed.data.qr_token)
    .single()

  if (!qrToken) {
    throw createError({ statusCode: 400, message: 'Invalid QR token' })
  }

  if (new Date(qrToken.expires_at) < new Date()) {
    throw createError({ statusCode: 400, message: 'QR token has expired' })
  }

  if (qrToken.is_used) {
    throw createError({ statusCode: 400, message: 'QR token has already been used' })
  }

  // Fetch customer_program joined with programs to get business_id and type
  const { data: customerProgram, error: cpError } = await db
    .from('customer_programs')
    .select('*, programs(business_id, type)')
    .eq('id', parsed.data.customer_program_id)
    .single()

  if (cpError || !customerProgram) {
    throw createError({ statusCode: 404, message: 'Customer program not found' })
  }

  const program = customerProgram.programs as { business_id: string; type: string }

  if (program.type !== 'membership') {
    throw createError({ statusCode: 400, message: 'Program is not a membership program' })
  }

  // Fetch program_membership_config to verify cashback_redemption_mode
  const { data: membershipConfig, error: configError } = await db
    .from('program_membership_config')
    .select('cashback_redemption_mode')
    .eq('program_id', customerProgram.program_id)
    .single()

  if (configError || !membershipConfig) {
    throw createError({ statusCode: 404, message: 'Membership config not found' })
  }

  if (membershipConfig.cashback_redemption_mode !== 'voucher') {
    throw createError({ statusCode: 400, message: 'This program does not use voucher redemption' })
  }

  // Fetch membership_voucher_options by voucher_option_id + program_id
  const { data: voucherOption, error: voError } = await db
    .from('membership_voucher_options')
    .select('*')
    .eq('id', parsed.data.voucher_option_id)
    .eq('program_id', customerProgram.program_id)
    .single()

  if (voError || !voucherOption) {
    throw createError({ statusCode: 404, message: 'Voucher option not found' })
  }

  if (!voucherOption.is_active) {
    throw createError({ statusCode: 400, message: 'Voucher option is not active' })
  }

  // Fetch customer_membership_state to check cashback_balance
  const { data: state, error: stateError } = await db
    .from('customer_membership_state')
    .select('*')
    .eq('customer_program_id', parsed.data.customer_program_id)
    .single()

  if (stateError || !state) {
    throw createError({ statusCode: 404, message: 'Membership state not found' })
  }

  if (state.cashback_balance < voucherOption.cashback_cost) {
    throw createError({ statusCode: 400, message: 'Insufficient cashback balance' })
  }

  // Deduct cashback_cost from cashback_balance
  const newBalance = state.cashback_balance - voucherOption.cashback_cost

  const { error: balanceError } = await db
    .from('customer_membership_state')
    .update({ cashback_balance: newBalance })
    .eq('customer_program_id', parsed.data.customer_program_id)

  if (balanceError) {
    throw createError({ statusCode: 500, message: balanceError.message })
  }

  // Generate unique code (10 chars hex)
  const code = crypto.randomBytes(5).toString('hex')

  // Calculate expires_at
  const expiresAt = new Date(Date.now() + voucherOption.expiry_days * 24 * 60 * 60 * 1000).toISOString()

  // Insert voucher
  const { data: voucher, error: voucherError } = await db
    .from('vouchers')
    .insert({
      customer_program_id: parsed.data.customer_program_id,
      voucher_option_id: parsed.data.voucher_option_id,
      business_id: program.business_id,
      code,
      status: 'active',
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (voucherError || !voucher) {
    throw createError({ statusCode: 500, message: voucherError?.message ?? 'Failed to create voucher' })
  }

  // Insert cashback_redeem transaction (customer-initiated, performed_by: null)
  const { data: transaction, error: txError } = await db
    .from('transactions')
    .insert({
      customer_program_id: parsed.data.customer_program_id,
      business_id: program.business_id,
      branch_id: null,
      type: 'cashback_redeem',
      performed_by: null,
      cashback_amount: -voucherOption.cashback_cost,
    })
    .select()
    .single()

  if (txError || !transaction) {
    throw createError({ statusCode: 500, message: txError?.message ?? 'Failed to create transaction' })
  }

  // Link transaction to voucher
  const { data: updatedVoucher, error: linkError } = await db
    .from('vouchers')
    .update({ transaction_id: transaction.id })
    .eq('id', voucher.id)
    .select()
    .single()

  if (linkError) {
    throw createError({ statusCode: 500, message: linkError.message })
  }

  return updatedVoucher
})
