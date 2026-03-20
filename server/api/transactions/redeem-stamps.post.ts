export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = stampRedeemSchema.safeParse(body)
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

  // 4. Fetch stamp config to get stamp_target
  const { data: stampConfig, error: configError } = await db
    .from('program_stamp_config')
    .select('stamp_target')
    .eq('program_id', program.id)
    .single()

  if (configError || !stampConfig) {
    throw createError({ statusCode: 500, message: 'Stamp config not found' })
  }

  // 5. Fetch current stamp progress
  const { data: progress, error: progressError } = await db
    .from('customer_stamp_progress')
    .select('current_stamps, total_stamps_earned, total_redemptions')
    .eq('customer_program_id', parsed.data.customer_program_id)
    .single()

  if (progressError || !progress) {
    throw createError({ statusCode: 404, message: 'Stamp progress not found' })
  }

  // 6. Verify sufficient stamps
  if (progress.current_stamps < stampConfig.stamp_target) {
    throw createError({ statusCode: 400, message: 'Insufficient stamps' })
  }

  // 7. Update stamp progress
  const newCurrentStamps = progress.current_stamps - stampConfig.stamp_target
  const newTotalRedemptions = progress.total_redemptions + 1

  const { data: updatedProgress, error: updateError } = await db
    .from('customer_stamp_progress')
    .update({
      current_stamps: newCurrentStamps,
      total_redemptions: newTotalRedemptions,
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
      type: 'stamp_redemption',
      performed_by: member.authUserId,
      stamps_count: -stampConfig.stamp_target,
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
