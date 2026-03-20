export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Customer ID is required' })

  const businessId = getBusinessIdFromQuery(event)

  await requireMember(event, businessId)

  const db = getServiceClient(event)

  // Step 1: Fetch the customer
  const { data: customer, error: customerError } = await db
    .from('customers')
    .select('id, phone, name, email, gender, auth_user_id, created_at, updated_at')
    .eq('id', id)
    .single()

  if (customerError || !customer) {
    throw createError({ statusCode: 404, message: 'Customer not found' })
  }

  // Step 2: Fetch customer_programs for this business (via programs.business_id)
  const { data: customerPrograms, error: cpError } = await db
    .from('customer_programs')
    .select(
      `
      id,
      program_id,
      branch_id,
      enrolled_at,
      is_active,
      programs!inner (
        id,
        name,
        type,
        description,
        is_active,
        color_primary,
        color_secondary,
        scope_type,
        scope_id,
        business_id
      )
    `,
    )
    .eq('customer_id', id)
    .eq('programs.business_id', businessId)

  if (cpError) throw createError({ statusCode: 500, message: cpError.message })

  if (!customerPrograms || customerPrograms.length === 0) {
    return { ...customer, programs: [] }
  }

  const cpIds = customerPrograms.map(cp => cp.id)

  // Step 3a: Fetch stamp progress for stamp programs
  const { data: stampProgress } = await db
    .from('customer_stamp_progress')
    .select(
      `
      customer_program_id,
      current_stamps,
      total_stamps_earned,
      total_redemptions,
      updated_at
    `,
    )
    .in('customer_program_id', cpIds)

  // Step 3b: Fetch membership state for membership programs
  const { data: membershipState } = await db
    .from('customer_membership_state')
    .select(
      `
      customer_program_id,
      current_tier_id,
      cashback_balance,
      total_spend,
      total_transaction_count,
      tier_upgraded_at,
      updated_at,
      membership_tiers (
        id,
        name,
        rank,
        cashback_percentage,
        color
      )
    `,
    )
    .in('customer_program_id', cpIds)

  // Index extension data by customer_program_id for O(1) lookup
  const stampByProgramId = Object.fromEntries(
    (stampProgress ?? []).map(sp => [sp.customer_program_id, sp]),
  )
  const membershipByProgramId = Object.fromEntries(
    (membershipState ?? []).map(ms => [ms.customer_program_id, ms]),
  )

  // Step 4: Assemble response
  const programs = customerPrograms.map((cp) => {
    const program = cp.programs as {
      id: string
      name: string
      type: string
      description: string | null
      is_active: boolean
      color_primary: string
      color_secondary: string
      scope_type: string
      scope_id: string
      business_id: string
    }

    if (program.type === 'stamp') {
      return {
        ...cp,
        program,
        stamp_progress: stampByProgramId[cp.id] ?? null,
        membership_state: null,
      }
    }
    else {
      return {
        ...cp,
        program,
        stamp_progress: null,
        membership_state: membershipByProgramId[cp.id] ?? null,
      }
    }
  })

  return { ...customer, programs }
})
