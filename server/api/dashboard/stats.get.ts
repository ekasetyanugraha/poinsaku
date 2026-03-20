export default defineEventHandler(async (event) => {
  const { business_id, branch_id } = getQuery(event)

  const businessId = business_id as string | undefined
  if (!businessId) {
    throw createError({ statusCode: 400, message: 'business_id is required' })
  }

  const member = await requireMember(event, businessId)

  // Force branch scope if member is branch-scoped
  let branchId: string | undefined = branch_id as string | undefined
  if (member.scopeType === 'branch') {
    branchId = member.branchId
  }

  const db = getServiceClient(event)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  // Build branch-scoped program query
  let programsQuery = db
    .from('programs')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('is_active', true)
  if (branchId) programsQuery = programsQuery.eq('scope_id', branchId)

  // Build stamps today query
  let stampsQuery = db
    .from('transactions')
    .select('stamps_count')
    .eq('business_id', businessId)
    .eq('type', 'stamp_add')
    .gte('created_at', todayISO)
  if (branchId) stampsQuery = stampsQuery.eq('branch_id', branchId)

  // Build redemptions this month query
  let redemptionsQuery = db
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .eq('type', 'stamp_redemption')
    .gte('created_at', thisMonth)
  if (branchId) redemptionsQuery = redemptionsQuery.eq('branch_id', branchId)

  // Build cashback earned this month query
  let cashbackQuery = db
    .from('transactions')
    .select('cashback_amount')
    .eq('business_id', businessId)
    .eq('type', 'cashback_earn')
    .gte('created_at', thisMonth)
  if (branchId) cashbackQuery = cashbackQuery.eq('branch_id', branchId)

  const [
    customersResult,
    programsResult,
    stampsResult,
    redemptionsResult,
    cashbackResult,
    vouchersResult,
  ] = await Promise.all([
    db
      .from('customer_business_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId),
    programsQuery,
    stampsQuery,
    redemptionsQuery,
    cashbackQuery,
    db
      .from('vouchers')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString()),
  ])

  const totalStampsToday = (stampsResult.data || []).reduce((sum, t) => sum + (t.stamps_count || 0), 0)
  const totalCashbackMonth = (cashbackResult.data || []).reduce((sum, t) => sum + (t.cashback_amount || 0), 0)

  return {
    total_customers: customersResult.count ?? 0,
    active_programs: programsResult.count ?? 0,
    stamps_today: totalStampsToday,
    redemptions_this_month: redemptionsResult.count ?? 0,
    cashback_earned_this_month: Math.round(totalCashbackMonth * 100) / 100,
    active_vouchers: vouchersResult.count ?? 0,
  }
})
