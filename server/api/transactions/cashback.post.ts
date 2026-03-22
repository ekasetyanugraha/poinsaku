export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = cashbackEarnSchema.safeParse(body)
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

  // Fetch current membership state
  const { data: state, error: stateError } = await db
    .from('customer_membership_state')
    .select('*')
    .eq('customer_program_id', parsed.data.customer_program_id)
    .single()

  if (stateError || !state) {
    throw createError({ statusCode: 404, message: 'Membership state not found' })
  }

  if (!state.current_tier_id) {
    throw createError({ statusCode: 400, message: 'Customer has no current tier assigned' })
  }

  // Fetch current tier to get cashback_percentage
  const { data: currentTier, error: tierError } = await db
    .from('membership_tiers')
    .select('*')
    .eq('id', state.current_tier_id)
    .single()

  if (tierError || !currentTier) {
    throw createError({ statusCode: 404, message: 'Current tier not found' })
  }

  // Calculate cashback
  const cashback_amount = Math.round(parsed.data.transaction_amount * (currentTier.cashback_percentage / 100) * 100) / 100

  // Update membership state
  const newCashbackBalance = state.cashback_balance + cashback_amount
  const newTotalSpend = state.total_spend + parsed.data.transaction_amount
  const newTotalTransactionCount = state.total_transaction_count + 1

  const { data: updatedState, error: updateError } = await db
    .from('customer_membership_state')
    .update({
      cashback_balance: newCashbackBalance,
      total_spend: newTotalSpend,
      total_transaction_count: newTotalTransactionCount,
    })
    .eq('customer_program_id', parsed.data.customer_program_id)
    .select()
    .single()

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  // Insert cashback_earn transaction
  const { data: cashbackTx, error: txError } = await db
    .from('transactions')
    .insert({
      customer_program_id: parsed.data.customer_program_id,
      business_id,
      branch_id: parsed.data.branch_id ?? null,
      type: 'cashback_earn',
      performed_by: member.authUserId,
      transaction_amount: parsed.data.transaction_amount,
      cashback_amount,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single()

  if (txError) {
    throw createError({ statusCode: 500, message: txError.message })
  }

  // Auto-tier-upgrade check
  // Load all tiers for this program ordered by rank DESC (highest first)
  const { data: allTiers, error: tiersError } = await db
    .from('membership_tiers')
    .select('*')
    .eq('program_id', currentTier.program_id)
    .order('rank', { ascending: false })

  if (tiersError) {
    throw createError({ statusCode: 500, message: tiersError.message })
  }

  let tierUpgradeTx = null
  let finalState = updatedState

  for (const tier of allTiers ?? []) {
    // Skip manual_only tiers for auto-upgrade
    if (tier.auto_upgrade_rule_type === 'manual_only') continue
    // Only consider tiers with higher rank than current
    if (tier.rank <= currentTier.rank) continue

    let qualifies = false
    if (tier.auto_upgrade_rule_type === 'total_spend' && tier.auto_upgrade_threshold !== null) {
      qualifies = newTotalSpend >= tier.auto_upgrade_threshold
    } else if (tier.auto_upgrade_rule_type === 'transaction_count' && tier.auto_upgrade_threshold !== null) {
      qualifies = newTotalTransactionCount >= tier.auto_upgrade_threshold
    }

    if (qualifies) {
      // Upgrade to this tier (highest qualifying tier, since ordered DESC)
      const { data: upgradedState, error: upgradeStateError } = await db
        .from('customer_membership_state')
        .update({ current_tier_id: tier.id, tier_upgraded_at: new Date().toISOString() })
        .eq('customer_program_id', parsed.data.customer_program_id)
        .select()
        .single()

      if (upgradeStateError) {
        throw createError({ statusCode: 500, message: upgradeStateError.message })
      }

      finalState = upgradedState

      // Insert tier_upgrade transaction
      const { data: upgradeTx, error: upgradeTxError } = await db
        .from('transactions')
        .insert({
          customer_program_id: parsed.data.customer_program_id,
          business_id,
          branch_id: parsed.data.branch_id ?? null,
          type: 'tier_upgrade',
          performed_by: member.authUserId,
          tier_from_id: state.current_tier_id,
          tier_to_id: tier.id,
          notes: null,
        })
        .select()
        .single()

      if (upgradeTxError) {
        throw createError({ statusCode: 500, message: upgradeTxError.message })
      }

      tierUpgradeTx = upgradeTx
      break
    }
  }

  return {
    transaction: cashbackTx,
    state: finalState,
    tier_upgrade: tierUpgradeTx,
  }
})
