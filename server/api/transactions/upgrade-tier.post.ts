export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = tierUpgradeSchema.safeParse(body)
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

  // Only owner or admin can manually upgrade tiers
  const member = await requireMember(event, business_id, { roles: ['owner', 'admin'] })

  if (program.type !== 'membership') {
    throw createError({ statusCode: 400, message: 'This endpoint is only for membership programs' })
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

  // Verify target_tier_id belongs to the same program
  const { data: targetTier, error: targetTierError } = await db
    .from('membership_tiers')
    .select('*')
    .eq('id', parsed.data.target_tier_id)
    .eq('program_id', customerProgram.program_id)
    .single()

  if (targetTierError || !targetTier) {
    throw createError({ statusCode: 404, message: 'Target tier not found or does not belong to this program' })
  }

  // Guard against no-op tier change
  if (state.current_tier_id === parsed.data.target_tier_id) {
    throw createError({ statusCode: 400, message: 'Customer is already on this tier' })
  }

  // Update customer_membership_state with new tier
  const { data: updatedState, error: updateError } = await db
    .from('customer_membership_state')
    .update({ current_tier_id: parsed.data.target_tier_id, tier_upgraded_at: new Date().toISOString() })
    .eq('customer_program_id', parsed.data.customer_program_id)
    .select()
    .single()

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  // Insert tier_upgrade transaction
  const { data: upgradeTx, error: txError } = await db
    .from('transactions')
    .insert({
      customer_program_id: parsed.data.customer_program_id,
      business_id,
      branch_id: null,
      type: 'tier_upgrade',
      performed_by: member.authUserId,
      tier_from_id: state.current_tier_id ?? null,
      tier_to_id: parsed.data.target_tier_id,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single()

  if (txError) {
    throw createError({ statusCode: 500, message: txError.message })
  }

  return {
    transaction: upgradeTx,
    state: updatedState,
  }
})
