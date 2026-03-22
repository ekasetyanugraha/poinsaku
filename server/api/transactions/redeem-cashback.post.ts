export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = cashbackRedeemSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const db = getServiceClient(event)

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
  const business_id = program.business_id

  const member = await requireMember(event, business_id)

  if (program.type !== 'membership') {
    throw createError({ statusCode: 400, message: 'This endpoint is only for membership programs' })
  }

  // Fetch program_membership_config to verify redemption mode
  const { data: membershipConfig, error: configError } = await db
    .from('program_membership_config')
    .select('cashback_redemption_mode')
    .eq('program_id', customerProgram.program_id)
    .single()

  if (configError || !membershipConfig) {
    throw createError({ statusCode: 404, message: 'Membership config not found' })
  }

  if (membershipConfig.cashback_redemption_mode !== 'transaction_deduction') {
    throw createError({ statusCode: 400, message: 'This program uses voucher redemption' })
  }

  // Fetch current membership state
  const { data: state, error: stateError } = await db
    .from('customer_membership_state')
    .select('*')
    .eq('customer_program_id', parsed.data.customer_program_id)
    .single()

  if (stateError || !state) {
    throw createError({ statusCode: 404, message: 'Membership state not found' })
  }

  if (state.cashback_balance < parsed.data.amount) {
    throw createError({ statusCode: 400, message: 'Insufficient cashback balance' })
  }

  // Deduct from cashback_balance
  const newCashbackBalance = state.cashback_balance - parsed.data.amount

  const { data: updatedState, error: updateError } = await db
    .from('customer_membership_state')
    .update({ cashback_balance: newCashbackBalance })
    .eq('customer_program_id', parsed.data.customer_program_id)
    .select()
    .single()

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  // Insert cashback_redeem transaction
  const { data: redeemTx, error: txError } = await db
    .from('transactions')
    .insert({
      customer_program_id: parsed.data.customer_program_id,
      business_id,
      branch_id: parsed.data.branch_id || null,
      type: 'cashback_redeem',
      performed_by: member.authUserId,
      cashback_amount: -parsed.data.amount,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single()

  if (txError) {
    throw createError({ statusCode: 500, message: txError.message })
  }

  return {
    transaction: redeemTx,
    state: updatedState,
  }
})
