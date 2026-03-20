export default defineEventHandler(async (event) => {
  const customerProgramId = getRouterParam(event, 'customerProgramId')
  if (!customerProgramId) {
    throw createError({ statusCode: 400, message: 'Customer program ID is required' })
  }

  const db = getServiceClient(event)

  // Fetch enrollment with program + customer details
  const { data: enrollment } = await db
    .from('customer_programs')
    .select(`
      *,
      customers!inner(id, name, phone),
      programs!inner(
        id, name, type, color_primary, color_secondary,
        businesses!inner(id, name, slug, logo_url)
      )
    `)
    .eq('id', customerProgramId)
    .single()

  if (!enrollment) {
    throw createError({ statusCode: 404, message: 'Customer program not found' })
  }

  const program = enrollment.programs as {
    id: string; name: string; type: string
    color_primary: string; color_secondary: string
    businesses: { id: string; name: string; slug: string; logo_url: string | null }
  }
  const customer = enrollment.customers as { id: string; name: string; phone: string }
  const business = program.businesses

  let typeState: Record<string, unknown> = {}

  if (program.type === 'stamp') {
    const [{ data: progress }, { data: config }] = await Promise.all([
      db.from('customer_stamp_progress').select('current_stamps, total_stamps_earned, total_redemptions').eq('customer_program_id', customerProgramId).single(),
      db.from('program_stamp_config').select('stamp_target, reward_description').eq('program_id', program.id).single(),
    ])
    typeState = {
      current_stamps: progress?.current_stamps ?? 0,
      total_stamps_earned: progress?.total_stamps_earned ?? 0,
      total_redemptions: progress?.total_redemptions ?? 0,
      stamp_target: config?.stamp_target ?? 0,
      reward_description: config?.reward_description ?? null,
    }
  } else {
    const [{ data: state }, { data: tiers }] = await Promise.all([
      db.from('customer_membership_state')
        .select('cashback_balance, total_spend, total_transactions, membership_tiers!customer_membership_state_current_tier_id_fkey(id, name, rank, cashback_percentage, color)')
        .eq('customer_program_id', customerProgramId).single(),
      db.from('membership_tiers')
        .select('id, name, rank, cashback_percentage, color')
        .eq('program_id', program.id).eq('is_active', true)
        .order('rank', { ascending: true }),
    ])
    const tier = state?.membership_tiers as { id: string; name: string; rank: number; cashback_percentage: number; color: string } | null
    typeState = {
      tier_name: tier?.name ?? 'Member',
      tier_color: tier?.color ?? null,
      cashback_balance: state?.cashback_balance ?? 0,
      cashback_percentage: tier?.cashback_percentage ?? 0,
      total_spend: state?.total_spend ?? 0,
      total_transactions: state?.total_transactions ?? 0,
      all_tiers: tiers ?? [],
    }
  }

  return {
    id: customerProgramId,
    customer_name: customer.name,
    program_name: program.name,
    program_type: program.type,
    business_name: business.name,
    business_logo: business.logo_url,
    color_primary: program.color_primary,
    color_secondary: program.color_secondary,
    is_active: enrollment.is_active,
    ...typeState,
  }
})
