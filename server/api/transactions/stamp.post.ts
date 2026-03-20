export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = stampAddSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Invalid input', data: parsed.error.flatten() })
  }

  const db = getServiceClient(event)

  // 1. Fetch customer_programs row, join programs to get business_id and type
  const { data: customerProgram, error: cpError } = await db
    .from('customer_programs')
    .select('id, program_id, programs(id, business_id, type)')
    .eq('id', parsed.data.customer_program_id)
    .single()

  if (cpError || !customerProgram) {
    throw createError({ statusCode: 404, message: 'Customer program not found' })
  }

  const program = customerProgram.programs as { id: string; business_id: string; type: string }
  const businessId = program.business_id

  // 2. Verify membership
  const member = await requireMember(event, businessId)

  // 3. Verify program type
  if (program.type !== 'stamp') {
    throw createError({ statusCode: 400, message: 'Program is not a stamp program' })
  }

  // 4. Fetch stamp config
  const { data: stampConfig, error: configError } = await db
    .from('program_stamp_config')
    .select('stamp_mode, stamps_per_transaction, amount_per_stamp, stamp_target')
    .eq('program_id', program.id)
    .single()

  if (configError || !stampConfig) {
    throw createError({ statusCode: 500, message: 'Stamp config not found' })
  }

  // 5. Calculate stamps to add
  let calculatedStamps: number

  if (parsed.data.stamps_count !== undefined) {
    // Manual override
    calculatedStamps = parsed.data.stamps_count
  } else if (stampConfig.stamp_mode === 'per_transaction') {
    calculatedStamps = stampConfig.stamps_per_transaction
  } else {
    // amount_based
    if (parsed.data.transaction_amount === undefined) {
      throw createError({ statusCode: 400, message: 'transaction_amount is required for amount_based stamp mode' })
    }
    if (!stampConfig.amount_per_stamp || stampConfig.amount_per_stamp <= 0) {
      throw createError({ statusCode: 500, message: 'Invalid amount_per_stamp in stamp config' })
    }
    calculatedStamps = Math.floor(parsed.data.transaction_amount / stampConfig.amount_per_stamp)
    if (calculatedStamps < 1) {
      throw createError({ statusCode: 400, message: 'Transaction amount too low to earn any stamps' })
    }
  }

  // 6. Fetch current stamp progress
  const { data: progress, error: progressError } = await db
    .from('customer_stamp_progress')
    .select('current_stamps, total_stamps_earned')
    .eq('customer_program_id', parsed.data.customer_program_id)
    .single()

  if (progressError || !progress) {
    throw createError({ statusCode: 404, message: 'Stamp progress not found' })
  }

  // 7. Update stamp progress
  const newCurrentStamps = progress.current_stamps + calculatedStamps
  const newTotalStampsEarned = progress.total_stamps_earned + calculatedStamps

  const { data: updatedProgress, error: updateError } = await db
    .from('customer_stamp_progress')
    .update({
      current_stamps: newCurrentStamps,
      total_stamps_earned: newTotalStampsEarned,
    })
    .eq('customer_program_id', parsed.data.customer_program_id)
    .select()
    .single()

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  // 8. Insert transaction record
  const { data: transaction, error: txError } = await db
    .from('transactions')
    .insert({
      customer_program_id: parsed.data.customer_program_id,
      business_id: businessId,
      branch_id: parsed.data.branch_id,
      type: 'stamp_add',
      performed_by: member.authUserId,
      transaction_amount: parsed.data.transaction_amount ?? null,
      stamps_count: calculatedStamps,
      notes: parsed.data.notes ?? null,
    })
    .select()
    .single()

  if (txError) {
    throw createError({ statusCode: 500, message: txError.message })
  }

  return {
    transaction,
    stamp_progress: updatedProgress,
  }
})
