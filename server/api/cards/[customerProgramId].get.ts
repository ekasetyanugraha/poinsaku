export default defineEventHandler(async (event) => {
  const customerProgramId = getRouterParam(event, 'customerProgramId')
  if (!customerProgramId) throw createError({ statusCode: 400, message: 'Customer program ID is required' })

  const db = getServiceClient(event)

  // Fetch enrollment with customer and program details
  const { data: enrollment } = await db
    .from('customer_programs')
    .select(`
      *,
      customers!inner(id, name, phone, email),
      programs!inner(
        id, name, description, type, scope_type, scope_id,
        color_primary, color_secondary, is_active,
        businesses!inner(id, name, slug, logo_url)
      )
    `)
    .eq('id', customerProgramId)
    .single()

  if (!enrollment) {
    throw createError({ statusCode: 404, message: 'Card not found' })
  }

  const program = enrollment.programs as {
    id: string
    type: string
    name: string
    description: string | null
    scope_type: string
    scope_id: string
    color_primary: string
    color_secondary: string
    is_active: boolean
    businesses: { id: string; name: string; slug: string; logo_url: string | null }
  }

  let stampProgress = null
  let stampConfig = null
  let membershipState = null
  let allTiers = null
  let membershipConfig = null
  let voucherOptions = null

  if (program.type === 'stamp') {
    // Fetch stamp progress
    const { data: spData } = await db
      .from('customer_stamp_progress')
      .select('*')
      .eq('customer_program_id', customerProgramId)
      .single()

    stampProgress = spData

    // Fetch stamp config
    const { data: scData } = await db
      .from('program_stamp_config')
      .select('*')
      .eq('program_id', program.id)
      .single()

    stampConfig = scData
  }
  else {
    // Fetch membership state with current tier
    const { data: msData } = await db
      .from('customer_membership_state')
      .select('*, membership_tiers!customer_membership_state_current_tier_id_fkey(id, name, rank, cashback_percentage, color)')
      .eq('customer_program_id', customerProgramId)
      .single()

    membershipState = msData

    // Fetch all active tiers for progress display
    const { data: tiersData } = await db
      .from('membership_tiers')
      .select('id, name, rank, cashback_percentage, color, auto_upgrade_rule_type, auto_upgrade_threshold')
      .eq('program_id', program.id)
      .eq('is_active', true)
      .order('rank', { ascending: true })

    allTiers = tiersData

    // Fetch membership config
    const { data: mcData } = await db
      .from('program_membership_config')
      .select('cashback_redemption_mode')
      .eq('program_id', program.id)
      .single()

    membershipConfig = mcData

    // If voucher mode, fetch active voucher options
    if (membershipConfig?.cashback_redemption_mode === 'voucher') {
      const { data } = await db
        .from('membership_voucher_options')
        .select('id, name, description, cashback_cost, expiry_days, image_url')
        .eq('program_id', program.id)
        .eq('is_active', true)
        .order('cashback_cost', { ascending: true })
      voucherOptions = data
    }
  }

  return {
    id: enrollment.id,
    customer: enrollment.customers,
    program: enrollment.programs,
    is_active: enrollment.is_active,
    enrolled_at: enrollment.enrolled_at,
    stamp_progress: stampProgress ?? null,
    stamp_config: stampConfig ?? null,
    membership_state: membershipState ?? null,
    all_tiers: allTiers ?? null,
    membership_config: membershipConfig ?? null,
    voucher_options: voucherOptions,
  }
})
